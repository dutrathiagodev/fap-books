-- Migration: renovação da reserva pedagógica (cards 0053 e 0055, parte do RF-32; RF-20 do PRD).
-- O professor pede mais dias para uma reserva APROVADA perto do fim do prazo; o pedido entra na fila da funcionária como
-- "Renovação" e só vale com nova aprovação dela.
--
-- Como funciona (decisões para o dono revisar):
--   * O pedido é uma linha nova em pedagogical_reservations com renewal_of = a reserva original (coluna que já existia).
--     Ela NÃO tem livros próprios (nenhuma linha em pedagogical_reservation_books): os exemplares são os da original. Assim
--     o exemplar guardado continua sendo UM por livro (pedagogical_held_copies, book_availability e relatórios contam por
--     livro e não duplicam) e aprovar a renovação não exige exemplar livre: ele já está com o professor.
--   * Aprovar: a reserva original ganha os dias novos (o fim do período avança); a linha da renovação fica "approved" como
--     registro da decisão. Recusar exige justificativa e não muda a original.
--   * Janela: só se pede a partir de 7 dias antes do fim (renewal_window_days) e até a devolução. O prazo de cada
--     renovação segue o limite de dias configurável (library_settings, card 0218); o total da reserva nunca passa de 365 dias.
--   * Só uma renovação pendente por reserva (índice único parcial). Renovação de renovação não existe: pede-se sempre
--     sobre a reserva original, quantas vezes a funcionária aprovar.
--   * Devolver a reserva original encerra as renovações ligadas a ela: as aprovadas viram "returned" e a pendente vira
--     "cancelled". Ordem de bloqueio fixa: livros, depois a original, depois a renovação (sem deadlock).
--   * Auditoria: reaproveita pedagogical_requested, pedagogical_approved e pedagogical_rejected, com renewal_of_id nos detalhes.

-- ---------------------------------------------------------------------------------------------------------------------
-- 1. Uma renovação pendente por reserva e janela de pedido
-- ---------------------------------------------------------------------------------------------------------------------

create unique index pedagogical_one_pending_renewal on public.pedagogical_reservations (renewal_of)
  where renewal_of is not null and status = 'pending';

-- Dias antes do fim do período em que o professor já pode pedir a renovação (o app repete o número só para avisar).
create function public.renewal_window_days() returns integer language sql immutable set search_path = '' as $$ select 7 $$;
revoke execute on function public.renewal_window_days() from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------------------------------
-- 2. Pedir a renovação (só o professor dono da reserva)
-- ---------------------------------------------------------------------------------------------------------------------

create function public.request_pedagogical_renewal(p_reservation_id uuid, p_days integer, p_idempotency_key uuid default null)
returns public.pedagogical_reservations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_original public.pedagogical_reservations;
  v_renewal public.pedagogical_reservations;
  v_previous uuid;
  v_today date := (clock_timestamp() at time zone 'America/Sao_Paulo')::date;
  v_end date;
  v_start date;
begin
  if not public.is_teacher() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_idempotency_key is not null then
    v_previous := public.claim_action_key(v_actor, p_idempotency_key, 'request_pedagogical_renewal');
    if v_previous is not null then
      select * into v_renewal from public.pedagogical_reservations where id = v_previous;
      return v_renewal;
    end if;
  end if;

  -- Trava a original: dois pedidos ao mesmo tempo entram um de cada vez.
  select * into v_original from public.pedagogical_reservations r where r.id = p_reservation_id for update;
  if not found or v_original.teacher_id <> v_actor then
    raise exception 'reservation_not_found' using hint = 'Reserva não encontrada.';
  end if;
  if v_original.renewal_of is not null then
    raise exception 'renewal_of_renewal' using hint = 'Peça a renovação sobre a reserva original.';
  end if;
  if v_original.status <> 'approved' then
    raise exception 'reservation_not_approved' using hint = 'Só uma reserva aprovada pode ser renovada.';
  end if;
  if p_days is null or p_days < 1 or p_days > public.pedagogical_max_days() then
    raise exception 'invalid_days' using hint = format('O prazo deve ser de 1 a %s dias.', public.pedagogical_max_days());
  end if;

  v_end := v_original.start_date + v_original.days;
  if v_today < v_end - public.renewal_window_days() then
    raise exception 'renewal_too_early' using hint = format('A renovação pode ser pedida a partir de %s dias antes do fim.', public.renewal_window_days());
  end if;
  if exists (select 1 from public.pedagogical_reservations r where r.renewal_of = v_original.id and r.status = 'pending') then
    raise exception 'renewal_already_pending' using hint = 'Já existe um pedido de renovação aguardando aprovação.';
  end if;

  -- O novo período começa no fim do atual (ou hoje, se o fim já passou sem devolução).
  v_start := greatest(v_end, v_today);
  if (v_start + p_days) - v_original.start_date > 365 then
    raise exception 'renewal_too_long' using hint = 'O período total da reserva não pode passar de 365 dias.';
  end if;

  insert into public.pedagogical_reservations (teacher_id, start_date, days, purpose, requested_in_person, created_by, renewal_of)
  values (v_actor, v_start, p_days, v_original.purpose, false, v_actor, v_original.id)
  returning * into v_renewal;

  insert into public.audit_logs (actor_id, action, entity, entity_id, details)
  values (v_actor, 'pedagogical_requested', 'pedagogical_reservations', v_renewal.id,
          jsonb_build_object('reservation_id', v_renewal.id, 'teacher_id', v_actor, 'renewal_of_id', v_original.id));

  if p_idempotency_key is not null then
    update public.action_keys set entity_id = v_renewal.id where actor_id = v_actor and key = p_idempotency_key;
  end if;
  return v_renewal;
end;
$$;

-- ---------------------------------------------------------------------------------------------------------------------
-- 3. Decidir (a função existente passa a tratar a renovação)
-- ---------------------------------------------------------------------------------------------------------------------

-- Igual à de 20261108180000, com o ramo da renovação: os livros e o exemplar guardado são os da reserva original, que é
-- travada antes da renovação. Aprovar renovação não confere exemplar livre (já está guardado) e estende a original.
create or replace function public.decide_pedagogical_reservation(
  p_reservation_id uuid, p_approve boolean, p_note text default null, p_idempotency_key uuid default null
)
returns public.pedagogical_reservations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_reservation public.pedagogical_reservations;
  v_original public.pedagogical_reservations;
  v_previous uuid;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_target text := case when p_approve then 'approved' else 'rejected' end;
  v_renewal_of uuid;
  v_book_ids uuid[];
  v_book record;
begin
  if not public.is_librarian() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_approve is null then
    raise exception 'decision_required' using hint = 'Escolha aprovar ou recusar.';
  end if;
  if not p_approve and v_note is null then
    raise exception 'note_required' using hint = 'Informe a justificativa da recusa.';
  end if;
  if v_note is not null and char_length(v_note) > 500 then
    raise exception 'note_too_long' using hint = 'A justificativa deve ter no máximo 500 caracteres.';
  end if;

  if p_idempotency_key is not null then
    v_previous := public.claim_action_key(v_actor, p_idempotency_key, 'decide_pedagogical');
    if v_previous is not null then
      select * into v_reservation from public.pedagogical_reservations where id = v_previous;
      return v_reservation;
    end if;
  end if;

  select r.renewal_of into v_renewal_of from public.pedagogical_reservations r where r.id = p_reservation_id;
  if not found then
    raise exception 'reservation_not_found' using hint = 'Solicitação não encontrada.';
  end if;

  -- Livros primeiro (os da própria reserva ou, na renovação, os da original), depois a original, depois a renovação.
  select array_agg(rb.book_id order by rb.book_id) into v_book_ids
  from public.pedagogical_reservation_books rb where rb.reservation_id = coalesce(v_renewal_of, p_reservation_id);
  perform 1 from public.books b where b.id = any (v_book_ids) order by b.id for update;
  if v_renewal_of is not null then
    select * into v_original from public.pedagogical_reservations r where r.id = v_renewal_of for update;
  end if;
  select * into v_reservation from public.pedagogical_reservations r where r.id = p_reservation_id for update;

  if v_reservation.status = v_target then
    return v_reservation;
  end if;
  if v_reservation.status <> 'pending' then
    raise exception 'already_decided' using hint = 'Esta solicitação já foi decidida.';
  end if;

  if p_approve and v_renewal_of is not null then
    -- Só se estende o que ainda está com o professor.
    if v_original.status <> 'approved' then
      raise exception 'reservation_not_approved' using hint = 'A reserva original não está mais aprovada.';
    end if;
  elsif p_approve then
    -- Exemplar livre = quantidade - empréstimos em aberto - reservas do aluno prontas - já guardados (mesma conta do gatilho).
    for v_book in
      select b.id, b.quantity, b.status from public.books b where b.id = any (v_book_ids)
    loop
      if v_book.status <> 'active' then
        raise exception 'book_inactive' using hint = 'Este livro não está disponível no acervo.';
      end if;
      if v_book.quantity
         - (select count(*) from public.loans l where l.book_id = v_book.id and l.returned_at is null)
         - (select count(*) from public.reservations r where r.book_id = v_book.id and r.status = 'ready')
         - public.pedagogical_held_copies(v_book.id) < 1 then
        raise exception 'no_copy_available' using hint = 'Um dos livros não tem exemplar livre agora.';
      end if;
    end loop;
  end if;

  update public.pedagogical_reservations
  set status = v_target, decided_by = v_actor, decided_at = clock_timestamp(), decision_note = v_note
  where id = p_reservation_id
  returning * into v_reservation;

  if p_approve and v_renewal_of is not null then
    -- O fim do período da original avança até o fim da renovação (o novo período pode ter começado hoje, se o fim já passou).
    update public.pedagogical_reservations
    set days = (v_reservation.start_date + v_reservation.days) - v_original.start_date
    where id = v_original.id;
  end if;

  insert into public.audit_logs (actor_id, action, entity, entity_id, details)
  values (v_actor, case when p_approve then 'pedagogical_approved' else 'pedagogical_rejected' end,
          'pedagogical_reservations', v_reservation.id,
          case when v_renewal_of is null
            then jsonb_build_object('reservation_id', v_reservation.id, 'teacher_id', v_reservation.teacher_id)
            else jsonb_build_object('reservation_id', v_reservation.id, 'teacher_id', v_reservation.teacher_id, 'renewal_of_id', v_renewal_of)
          end);

  if p_idempotency_key is not null then
    update public.action_keys set entity_id = v_reservation.id where actor_id = v_actor and key = p_idempotency_key;
  end if;
  return v_reservation;
end;
$$;

-- ---------------------------------------------------------------------------------------------------------------------
-- 4. Devolver a original encerra as renovações dela
-- ---------------------------------------------------------------------------------------------------------------------

-- Igual à de 20261108180000, com o fechamento das renovações (aprovadas -> returned, pendente -> cancelled).
create or replace function public.return_pedagogical_reservation(p_reservation_id uuid, p_idempotency_key uuid default null)
returns public.pedagogical_reservations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_reservation public.pedagogical_reservations;
  v_previous uuid;
  v_book_ids uuid[];
  v_book_id uuid;
  v_now timestamptz;
begin
  if not public.is_librarian() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_idempotency_key is not null then
    v_previous := public.claim_action_key(v_actor, p_idempotency_key, 'return_pedagogical');
    if v_previous is not null then
      select * into v_reservation from public.pedagogical_reservations where id = v_previous;
      return v_reservation;
    end if;
  end if;

  perform 1 from public.pedagogical_reservations r where r.id = p_reservation_id;
  if not found then
    raise exception 'reservation_not_found' using hint = 'Solicitação não encontrada.';
  end if;

  select array_agg(rb.book_id order by rb.book_id) into v_book_ids
  from public.pedagogical_reservation_books rb where rb.reservation_id = p_reservation_id;
  perform 1 from public.books b where b.id = any (v_book_ids) order by b.id for update;
  select * into v_reservation from public.pedagogical_reservations r where r.id = p_reservation_id for update;

  if v_reservation.status = 'returned' then
    return v_reservation;
  end if;
  if v_reservation.status <> 'approved' or v_reservation.renewal_of is not null then
    raise exception 'reservation_not_approved' using hint = 'Só uma reserva aprovada pode ser devolvida.';
  end if;

  v_now := clock_timestamp();
  update public.pedagogical_reservations
  set status = 'returned', returned_at = v_now, returned_by = v_actor
  where id = p_reservation_id
  returning * into v_reservation;

  -- As renovações desta reserva acabam junto com ela: nada fica "aprovado" ou "pendente" sem reserva.
  update public.pedagogical_reservations
  set status = 'returned', returned_at = v_now, returned_by = v_actor
  where renewal_of = p_reservation_id and status = 'approved';
  update public.pedagogical_reservations
  set status = 'cancelled'
  where renewal_of = p_reservation_id and status = 'pending';

  foreach v_book_id in array v_book_ids loop
    perform public.promote_reservations(v_book_id);
  end loop;

  insert into public.audit_logs (actor_id, action, entity, entity_id, details)
  values (v_actor, 'pedagogical_returned', 'pedagogical_reservations', v_reservation.id,
          jsonb_build_object('reservation_id', v_reservation.id, 'teacher_id', v_reservation.teacher_id));

  if p_idempotency_key is not null then
    update public.action_keys set entity_id = v_reservation.id where actor_id = v_actor and key = p_idempotency_key;
  end if;
  return v_reservation;
end;
$$;

revoke execute on function public.request_pedagogical_renewal(uuid, integer, uuid) from public, anon;
grant execute on function public.request_pedagogical_renewal(uuid, integer, uuid) to authenticated;
