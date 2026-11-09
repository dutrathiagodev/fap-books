-- Migration: fluxo da reserva pedagógica (cards 0090, 0091, 0092; histórias 0048, 0049, 0050, 0052, 0054; RF-16 a RF-19).
-- O professor pede (online) ou a funcionária registra o pedido feito no balcão; a funcionária aprova ou recusa; ao fim do
-- período didático ela registra a devolução e os exemplares voltam para a estante.
-- Depende de 20261008034701 (tabelas), 20261027180000 (auditoria) e 20261108100200 (claim_action_key e as regras de empréstimo).
--
-- DECISÃO DE CONCORRÊNCIA COM O EMPRÉSTIMO COMUM (revisar com o dono):
--   Reserva APROVADA guarda 1 exemplar de cada livro dela, da aprovação até a devolução (ou cancelamento).
--   Reserva PENDENTE não guarda nada (é só um pedido). Por isso:
--     * aprovar só é possível se cada livro tem exemplar livre naquele momento (senão: no_copy_available);
--     * create_loan, a reserva do aluno, a fila (promote_reservations), o corte de quantidade e a pesquisa de livros
--       (book_availability) passam a descontar os exemplares guardados. O empréstimo comum nunca leva um exemplar aprovado.
--   Por que guardar já na aprovação e não só na data de início: se guardasse só na data, um empréstimo comum feito antes
--   poderia deixar o livro fora da estante justo no dia da aula, e a aprovação teria sido uma promessa que o banco não cumpre.
--   Custo: o exemplar fica fora do empréstimo comum desde a aprovação, mesmo que a aula comece só daqui a semanas.
--   Alternativa (se o custo incomodar): guardar só a partir de (start_date - N dias) e, na aprovação, exigir exemplar livre
--   também em empréstimos que vencem depois do início.
--
-- Escrita só pelas funções: a política que deixava o professor inserir direto nas tabelas é removida, porque a escrita
-- direta pulava as regras (livro ativo, sem repetir livro, data, prazo de 1 a 30 dias).
-- Erros: a mensagem da exceção é um código estável (o app mapeia); o "hint" traz o texto em português; permissão negada
-- usa o SQLSTATE 42501.

-- ---------------------------------------------------------------------------------------------------------------------
-- 1. Colunas novas e escrita só pelas funções
-- ---------------------------------------------------------------------------------------------------------------------

alter table public.pedagogical_reservations
  add column purpose text check (purpose is null or char_length(purpose) between 1 and 120),     -- disciplina/turma (opcional)
  add column decision_note text check (decision_note is null or char_length(decision_note) between 1 and 500),
  add column created_by uuid references public.profiles (id) on delete set null,                -- quem registrou (professor ou funcionária)
  add column returned_at timestamptz,
  add column returned_by uuid references public.profiles (id) on delete set null,
  add constraint pedagogical_rejection_has_note check (status <> 'rejected' or decision_note is not null),
  add constraint pedagogical_returned_has_date check ((status = 'returned') = (returned_at is not null));

-- Fila e "Minhas reservas" ordenam por data de criação, dentro de cada status.
create index idx_pedagogical_reservations_status_created on public.pedagogical_reservations (status, created_at desc);

drop policy "pedagogical_insert_teacher" on public.pedagogical_reservations;
drop policy "pedagogical_books_insert_teacher" on public.pedagogical_reservation_books;

-- ---------------------------------------------------------------------------------------------------------------------
-- 2. Exemplares guardados por reserva aprovada
-- ---------------------------------------------------------------------------------------------------------------------

-- Quantos exemplares do livro estão guardados por reservas pedagógicas aprovadas (1 por reserva). Quem chama já tem o
-- livro travado (for update) quando a contagem precisa ser exata.
create function public.pedagogical_held_copies(p_book_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.pedagogical_reservation_books rb
  join public.pedagogical_reservations r on r.id = rb.reservation_id
  where rb.book_id = p_book_id and r.status = 'approved';
$$;

revoke execute on function public.pedagogical_held_copies(uuid) from public, anon, authenticated;

-- Gatilho de empréstimo: agora também desconta os exemplares guardados (mesma função da migration 20261108100200,
-- com v_held acrescentado nas duas contas de exemplar livre).
create or replace function public.loans_enforce_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_graduating boolean;
  v_quantity integer;
  v_user_open integer;
  v_book_open integer;
  v_ready_others integer;
  v_held integer;
begin
  if tg_op = 'UPDATE' then
    if new.book_id is distinct from old.book_id or new.user_id is distinct from old.user_id then
      raise exception 'loan_immutable' using hint = 'Livro e usuário de um empréstimo não podem ser trocados.';
    end if;
    if old.returned_at is not null and new.returned_at is null then
      raise exception 'loan_already_returned' using hint = 'Este empréstimo já foi devolvido.';
    end if;
    return new;
  end if;

  if new.returned_at is not null then
    return new;
  end if;

  select p.graduating into v_graduating from public.profiles p where p.id = new.user_id for no key update;
  select b.quantity into v_quantity from public.books b where b.id = new.book_id for update;

  select count(*) into v_user_open from public.loans l where l.user_id = new.user_id and l.returned_at is null;
  if v_user_open >= public.loan_limit_for(coalesce(v_graduating, false)) then
    raise exception 'loan_limit_reached'
      using hint = format('O limite é de %s livros ao mesmo tempo.', public.loan_limit_for(coalesce(v_graduating, false)));
  end if;

  select count(*) into v_book_open from public.loans l where l.book_id = new.book_id and l.returned_at is null;
  v_held := public.pedagogical_held_copies(new.book_id);
  if v_book_open + v_held >= coalesce(v_quantity, 0) then
    raise exception 'no_copy_available' using hint = 'Não há exemplar livre deste livro.';
  end if;

  select count(*) into v_ready_others from public.reservations r
  where r.book_id = new.book_id and r.status = 'ready' and r.user_id <> new.user_id;
  if v_quantity - v_book_open - v_held - v_ready_others < 1 then
    raise exception 'copy_reserved_for_others' using hint = 'O exemplar livre está reservado para outra pessoa.';
  end if;

  return new;
end;
$$;

-- Não deixa baixar a quantidade para menos que empréstimos em aberto mais exemplares guardados.
create or replace function public.books_enforce_quantity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.quantity < old.quantity then
    perform 1 from public.books b where b.id = new.id for update;
    if (select count(*) from public.loans l where l.book_id = new.id and l.returned_at is null)
       + public.pedagogical_held_copies(new.id) > new.quantity then
      raise exception 'quantity_below_open_loans'
        using hint = 'Há mais empréstimos em aberto e reservas pedagógicas aprovadas do que a nova quantidade de exemplares.';
    end if;
  end if;
  return new;
end;
$$;

-- Reserva do aluno: só quando não há exemplar livre (já descontando os guardados para a reserva pedagógica).
create or replace function public.reservations_enforce_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quantity integer;
  v_status text;
  v_open integer;
  v_ready integer;
begin
  if new.status not in ('waiting', 'ready') then
    return new;
  end if;

  select b.quantity, b.status into v_quantity, v_status from public.books b where b.id = new.book_id for update;
  if v_status is distinct from 'active' then
    raise exception 'book_inactive' using hint = 'Este livro não está disponível no acervo.';
  end if;

  if exists (
    select 1 from public.loans l where l.book_id = new.book_id and l.user_id = new.user_id and l.returned_at is null
  ) then
    raise exception 'already_borrowed' using hint = 'Você já está com este livro.';
  end if;

  if tg_op = 'INSERT' then
    select count(*) into v_open from public.loans l where l.book_id = new.book_id and l.returned_at is null;
    select count(*) into v_ready from public.reservations r where r.book_id = new.book_id and r.status = 'ready';
    if v_quantity - v_open - v_ready - public.pedagogical_held_copies(new.book_id) >= 1 then
      raise exception 'book_available' using hint = 'Há exemplar livre: faça o empréstimo em vez de reservar.';
    end if;
  end if;

  return new;
end;
$$;

-- Fila: só promove a "pronta" enquanto sobrar exemplar depois dos empréstimos, das prontas e dos guardados.
create or replace function public.promote_reservations(p_book_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_free integer;
begin
  select b.quantity
       - (select count(*) from public.loans l where l.book_id = b.id and l.returned_at is null)
       - (select count(*) from public.reservations r where r.book_id = b.id and r.status = 'ready')
       - public.pedagogical_held_copies(b.id)
  into v_free
  from public.books b where b.id = p_book_id;

  if coalesce(v_free, 0) > 0 then
    update public.reservations r set status = 'ready'
    where r.id in (
      select w.id from public.reservations w
      where w.book_id = p_book_id and w.status = 'waiting'
      order by w.created_at, w.id
      limit v_free
    );
  end if;
end;
$$;

-- Pesquisa de livros: "open_loans" passa a ser "exemplares fora da estante" (empréstimos em aberto + guardados pela
-- reserva pedagógica aprovada), então o app mostra o livro como emprestado sem mudar nada. Continua sem dado de pessoa.
-- "next_due_at": a primeira data em que um exemplar volta (prazo do empréstimo ou fim do período da reserva pedagógica).
create or replace function public.book_availability()
returns table (book_id uuid, open_loans integer, has_active_reservation boolean, next_due_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select
    b.id,
    (select count(*)::integer from public.loans l where l.book_id = b.id and l.returned_at is null)
      + public.pedagogical_held_copies(b.id),
    exists (select 1 from public.reservations r where r.book_id = b.id and r.status in ('waiting', 'ready')),
    least(
      (select min(l.due_at) from public.loans l where l.book_id = b.id and l.returned_at is null),
      (select min(((r.start_date + r.days)::timestamp) at time zone 'America/Sao_Paulo')
       from public.pedagogical_reservation_books rb
       join public.pedagogical_reservations r on r.id = rb.reservation_id
       where rb.book_id = b.id and r.status = 'approved')
    )
  from public.books b
  where b.status = 'active'
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.active);
$$;

-- ---------------------------------------------------------------------------------------------------------------------
-- 3. Funções do fluxo (chamadas pelo app via RPC)
-- ---------------------------------------------------------------------------------------------------------------------

-- Limites do pedido, num lugar só (o app repete os mesmos números só para avisar antes; quem decide é o banco).
create function public.pedagogical_max_days() returns integer language sql immutable set search_path = '' as $$ select 30 $$;
create function public.pedagogical_max_books() returns integer language sql immutable set search_path = '' as $$ select 10 $$;
revoke execute on function public.pedagogical_max_days() from public, anon, authenticated;
revoke execute on function public.pedagogical_max_books() from public, anon, authenticated;

-- Cria o pedido (pendente) com seus livros. Usada pelas duas portas de entrada (professor e balcão); ninguém de fora
-- a executa. Valida tudo; qualquer falha desfaz a transação inteira.
create function public.create_pedagogical_reservation(
  p_teacher_id uuid, p_book_ids uuid[], p_start_date date, p_days integer, p_purpose text, p_actor uuid, p_in_person boolean
)
returns public.pedagogical_reservations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reservation public.pedagogical_reservations;
  v_purpose text := nullif(btrim(coalesce(p_purpose, '')), '');
  v_today date := (clock_timestamp() at time zone 'America/Sao_Paulo')::date;
  v_count integer;
begin
  if p_book_ids is null or coalesce(array_length(p_book_ids, 1), 0) = 0 then
    raise exception 'books_required' using hint = 'Escolha pelo menos um livro.';
  end if;
  if array_length(p_book_ids, 1) > public.pedagogical_max_books() then
    raise exception 'too_many_books' using hint = format('Escolha no máximo %s livros por solicitação.', public.pedagogical_max_books());
  end if;
  if exists (select 1 from unnest(p_book_ids) as x(id) where x.id is null)
     or (select count(distinct x.id) from unnest(p_book_ids) as x(id)) <> array_length(p_book_ids, 1) then
    raise exception 'duplicate_books' using hint = 'O mesmo livro foi escolhido mais de uma vez.';
  end if;
  if p_days is null or p_days < 1 or p_days > public.pedagogical_max_days() then
    raise exception 'invalid_days' using hint = format('O prazo deve ser de 1 a %s dias.', public.pedagogical_max_days());
  end if;
  if p_start_date is null or p_start_date < v_today then
    raise exception 'start_in_past' using hint = 'A data de início não pode ser no passado.';
  end if;
  if p_start_date > v_today + 365 then
    raise exception 'start_too_far' using hint = 'A data de início deve ser dentro de um ano.';
  end if;
  if v_purpose is not null and char_length(v_purpose) > 120 then
    raise exception 'purpose_too_long' using hint = 'A disciplina deve ter no máximo 120 caracteres.';
  end if;

  select count(*) into v_count from public.books b where b.id = any (p_book_ids);
  if v_count <> array_length(p_book_ids, 1) then
    raise exception 'book_not_found' using hint = 'Livro não encontrado.';
  end if;
  if exists (select 1 from public.books b where b.id = any (p_book_ids) and b.status <> 'active') then
    raise exception 'book_inactive' using hint = 'Este livro não está disponível no acervo.';
  end if;

  insert into public.pedagogical_reservations (teacher_id, start_date, days, purpose, requested_in_person, created_by)
  values (p_teacher_id, p_start_date, p_days, v_purpose, p_in_person, p_actor)
  returning * into v_reservation;

  insert into public.pedagogical_reservation_books (reservation_id, book_id)
  select v_reservation.id, x.id from unnest(p_book_ids) as x(id);

  insert into public.audit_logs (actor_id, action, entity, entity_id, details)
  values (p_actor, 'pedagogical_requested', 'pedagogical_reservations', v_reservation.id,
          jsonb_build_object('reservation_id', v_reservation.id, 'teacher_id', p_teacher_id));

  return v_reservation;
end;
$$;

revoke execute on function public.create_pedagogical_reservation(uuid, uuid[], date, integer, text, uuid, boolean) from public, anon, authenticated;

-- Solicitação online: só o professor ativo, em nome dele mesmo.
create function public.request_pedagogical_reservation(
  p_book_ids uuid[], p_start_date date, p_days integer, p_purpose text default null, p_idempotency_key uuid default null
)
returns public.pedagogical_reservations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_reservation public.pedagogical_reservations;
  v_previous uuid;
begin
  if not public.is_teacher() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_idempotency_key is not null then
    v_previous := public.claim_action_key(v_actor, p_idempotency_key, 'request_pedagogical');
    if v_previous is not null then
      select * into v_reservation from public.pedagogical_reservations where id = v_previous;
      return v_reservation;
    end if;
  end if;

  v_reservation := public.create_pedagogical_reservation(v_actor, p_book_ids, p_start_date, p_days, p_purpose, v_actor, false);

  if p_idempotency_key is not null then
    update public.action_keys set entity_id = v_reservation.id where actor_id = v_actor and key = p_idempotency_key;
  end if;
  return v_reservation;
end;
$$;

-- Solicitação presencial: a funcionária registra em nome do professor. Entra na mesma fila (pendente), marcada como
-- "presencial"; a aprovação continua sendo uma decisão à parte.
create function public.register_in_person_pedagogical_reservation(
  p_teacher_id uuid, p_book_ids uuid[], p_start_date date, p_days integer, p_purpose text default null, p_idempotency_key uuid default null
)
returns public.pedagogical_reservations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_reservation public.pedagogical_reservations;
  v_previous uuid;
begin
  if not public.is_librarian() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_idempotency_key is not null then
    v_previous := public.claim_action_key(v_actor, p_idempotency_key, 'register_pedagogical');
    if v_previous is not null then
      select * into v_reservation from public.pedagogical_reservations where id = v_previous;
      return v_reservation;
    end if;
  end if;

  if not exists (select 1 from public.profiles p where p.id = p_teacher_id and p.role = 'teacher' and p.active) then
    raise exception 'teacher_not_found' using hint = 'Professor não encontrado ou inativo.';
  end if;

  v_reservation := public.create_pedagogical_reservation(p_teacher_id, p_book_ids, p_start_date, p_days, p_purpose, v_actor, true);

  if p_idempotency_key is not null then
    update public.action_keys set entity_id = v_reservation.id where actor_id = v_actor and key = p_idempotency_key;
  end if;
  return v_reservation;
end;
$$;

-- Aprovar ou recusar (só a funcionária). Recusa exige justificativa. Aprovar guarda 1 exemplar de cada livro e só é
-- possível se todos têm exemplar livre agora. Ordem de bloqueio: livros (por id) e depois a reserva, a mesma das outras
-- funções (livro antes do registro), sem deadlock entre duas decisões que dividem livros.
-- Decidir de novo com a MESMA decisão devolve a reserva como está; com decisão diferente é erro (already_decided).
create function public.decide_pedagogical_reservation(
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
  v_previous uuid;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_target text := case when p_approve then 'approved' else 'rejected' end;
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

  perform 1 from public.pedagogical_reservations r where r.id = p_reservation_id;
  if not found then
    raise exception 'reservation_not_found' using hint = 'Solicitação não encontrada.';
  end if;

  select array_agg(rb.book_id order by rb.book_id) into v_book_ids
  from public.pedagogical_reservation_books rb where rb.reservation_id = p_reservation_id;
  perform 1 from public.books b where b.id = any (v_book_ids) order by b.id for update;
  select * into v_reservation from public.pedagogical_reservations r where r.id = p_reservation_id for update;

  if v_reservation.status = v_target then
    return v_reservation;
  end if;
  if v_reservation.status <> 'pending' then
    raise exception 'already_decided' using hint = 'Esta solicitação já foi decidida.';
  end if;

  if p_approve then
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

  insert into public.audit_logs (actor_id, action, entity, entity_id, details)
  values (v_actor, case when p_approve then 'pedagogical_approved' else 'pedagogical_rejected' end,
          'pedagogical_reservations', v_reservation.id,
          jsonb_build_object('reservation_id', v_reservation.id, 'teacher_id', v_reservation.teacher_id));

  if p_idempotency_key is not null then
    update public.action_keys set entity_id = v_reservation.id where actor_id = v_actor and key = p_idempotency_key;
  end if;
  return v_reservation;
end;
$$;

-- Devolução ao fim do período didático (só a funcionária): os exemplares voltam para a estante e a fila de reservas
-- do aluno é promovida onde houver exemplar livre. Devolver de novo não faz nada.
create function public.return_pedagogical_reservation(p_reservation_id uuid, p_idempotency_key uuid default null)
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
  if v_reservation.status <> 'approved' then
    raise exception 'reservation_not_approved' using hint = 'Só uma reserva aprovada pode ser devolvida.';
  end if;

  update public.pedagogical_reservations
  set status = 'returned', returned_at = clock_timestamp(), returned_by = v_actor
  where id = p_reservation_id
  returning * into v_reservation;

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

revoke execute on function public.request_pedagogical_reservation(uuid[], date, integer, text, uuid) from public, anon;
revoke execute on function public.register_in_person_pedagogical_reservation(uuid, uuid[], date, integer, text, uuid) from public, anon;
revoke execute on function public.decide_pedagogical_reservation(uuid, boolean, text, uuid) from public, anon;
revoke execute on function public.return_pedagogical_reservation(uuid, uuid) from public, anon;
grant execute on function public.request_pedagogical_reservation(uuid[], date, integer, text, uuid) to authenticated;
grant execute on function public.register_in_person_pedagogical_reservation(uuid, uuid[], date, integer, text, uuid) to authenticated;
grant execute on function public.decide_pedagogical_reservation(uuid, boolean, text, uuid) to authenticated;
grant execute on function public.return_pedagogical_reservation(uuid, uuid) to authenticated;
