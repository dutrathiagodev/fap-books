-- Migration: fila de espera do livro indisponível (cards 0044 e 0045, RF-20; a tela "Minhas reservas" é o card 0216).
-- As funções reserve_book, cancel_reservation e promote_reservations já existem (20261108100200 e 20261108180000).
-- Esta migration fecha o que faltava para a fila funcionar de ponta a ponta:
--   1. Prazo de retirada: quando a devolução libera o exemplar, o primeiro da fila vira "pronta" (ready) e tem 2 dias
--      para retirar. Passou do prazo, a reserva expira (expired) e o exemplar segue para o próximo. A expiração acontece
--      dentro de promote_reservations (chamada por empréstimo, devolução, reserva e cancelamento) e, para a rotina
--      agendada, em expire_overdue_reservations().
--   2. reserve_book respeita o limite de livros (3, ou 4 para formando) e o bloqueio por atraso ou multa (RF-15).
--   3. A pessoa não grava mais direto na tabela (a policy de insert é removida): só reserve_book, que tem as regras.
--   4. cancel_reservation passa a aceitar a chave de idempotência; expire_reservation (só funcionária) expira uma pronta
--      que ninguém retirou.
--   5. Leituras seguras para as telas: list_my_reservations() (as minhas, com posição na fila) e
--      book_reservation_status() (tamanho da fila e a minha situação no livro, sem dado de outras pessoas).
--   6. Auditoria: a promoção e a expiração passam a ser registradas (só ids, LGPD).

-- ---------------------------------------------------------------------------------------------------------------------
-- 1. Colunas, status "expired" e índices
-- ---------------------------------------------------------------------------------------------------------------------

alter table public.reservations
  add column ready_at timestamptz,
  add column expires_at timestamptz;

-- Reservas que já estavam "prontas" antes desta migration ganham o prazo a partir de agora.
update public.reservations set ready_at = now(), expires_at = now() + interval '2 days' where status = 'ready';

alter table public.reservations drop constraint reservations_status_check;
alter table public.reservations add constraint reservations_status_check
  check (status in ('waiting', 'ready', 'fulfilled', 'cancelled', 'expired'));
alter table public.reservations add constraint reservations_ready_has_deadline
  check (status <> 'ready' or expires_at is not null);

-- A fila de um livro (waiting, por ordem de chegada) e a busca das prontas vencidas.
create index idx_reservations_queue on public.reservations (book_id, created_at, id) where status = 'waiting';
create index idx_reservations_ready_expires on public.reservations (expires_at) where status = 'ready';

-- Dias que a pessoa tem para retirar o livro depois do aviso. Mudou a regra? Mude aqui (e em reservation-rules.ts).
create function public.reservation_pickup_days() returns integer language sql immutable set search_path = '' as $$ select 2 $$;
revoke execute on function public.reservation_pickup_days() from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------------------------------
-- 2. Auditoria: ações novas
-- ---------------------------------------------------------------------------------------------------------------------

alter table public.audit_logs drop constraint audit_logs_action_known;
alter table public.audit_logs add constraint audit_logs_action_known check (action = any (array[
  'loan_created','loan_returned','loan_renewed','reservation_created','reservation_cancelled','reservation_approved',
  'reservation_rejected','pedagogical_requested','pedagogical_approved','pedagogical_rejected','pedagogical_returned',
  'fine_created','fine_paid','book_created','book_updated','book_inactivated','book_deleted','profile_created',
  'profile_updated','profile_viewed','profile_inactivated','profile_reactivated','library_setting_changed',
  'loan_notice_sent','reservation_ready','reservation_expired'
])) not valid;

-- ---------------------------------------------------------------------------------------------------------------------
-- 3. Fila: expira as prontas vencidas e promove as próximas (quem chama já tem o livro travado)
-- ---------------------------------------------------------------------------------------------------------------------

create or replace function public.promote_reservations(p_book_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_now timestamptz := clock_timestamp();
  v_free integer;
begin
  -- 1. Quem não retirou no prazo perde a vez.
  with expired as (
    update public.reservations r set status = 'expired'
    where r.book_id = p_book_id and r.status = 'ready' and r.expires_at < v_now
    returning r.id, r.user_id
  )
  insert into public.audit_logs (actor_id, action, entity, entity_id, details)
  select v_actor, 'reservation_expired', 'reservations', e.id,
         jsonb_build_object('reservation_id', e.id, 'book_id', p_book_id, 'user_id', e.user_id)
  from expired e;

  -- 2. Exemplar livre = quantidade menos empréstimos, prontas e guardados da reserva pedagógica.
  select b.quantity
       - (select count(*) from public.loans l where l.book_id = b.id and l.returned_at is null)
       - (select count(*) from public.reservations r where r.book_id = b.id and r.status = 'ready')
       - public.pedagogical_held_copies(b.id)
  into v_free
  from public.books b where b.id = p_book_id;

  -- 3. Os mais antigos da fila viram "prontos", com prazo de retirada.
  if coalesce(v_free, 0) > 0 then
    with promoted as (
      update public.reservations r
      set status = 'ready', ready_at = v_now, expires_at = v_now + make_interval(days => public.reservation_pickup_days())
      where r.id in (
        select w.id from public.reservations w
        where w.book_id = p_book_id and w.status = 'waiting'
        order by w.created_at, w.id
        limit v_free
      )
      returning r.id, r.user_id
    )
    insert into public.audit_logs (actor_id, action, entity, entity_id, details)
    select v_actor, 'reservation_ready', 'reservations', p.id,
           jsonb_build_object('reservation_id', p.id, 'book_id', p_book_id, 'user_id', p.user_id)
    from promoted p;
  end if;
end;
$$;

-- Para a tarefa agendada (sem usuário logado): expira as prontas vencidas e passa a vez, livro por livro, em lote.
-- Ninguém do app executa (só quem tem acesso direto ao banco, como a rotina agendada). Devolve quantos livros tratou.
create function public.expire_overdue_reservations()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_book uuid;
  v_count integer := 0;
begin
  for v_book in
    select distinct r.book_id from public.reservations r
    where r.status = 'ready' and r.expires_at < clock_timestamp()
    limit 500
  loop
    perform 1 from public.books b where b.id = v_book for update;
    perform public.promote_reservations(v_book);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke execute on function public.expire_overdue_reservations() from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------------------------------
-- 4. Escrita só pelas funções
-- ---------------------------------------------------------------------------------------------------------------------

-- A pessoa inseria direto na tabela e pulava limite, bloqueio e exemplar livre. Agora só reserve_book cria reserva.
drop policy "reservations_insert_own" on public.reservations;

-- ---------------------------------------------------------------------------------------------------------------------
-- 5. Reservar: limite de livros e bloqueio por atraso ou multa
-- ---------------------------------------------------------------------------------------------------------------------

-- A própria pessoa (p_user_id nulo) ou a funcionária por ela. Ordem de bloqueio: pessoa, livro, reserva (a mesma das outras).
create or replace function public.reserve_book(p_book_id uuid, p_user_id uuid default null, p_idempotency_key uuid default null)
returns public.reservations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_target uuid := coalesce(p_user_id, (select auth.uid()));
  v_reservation public.reservations;
  v_previous uuid;
  v_graduating boolean;
begin
  if v_actor is null or not exists (select 1 from public.profiles p where p.id = v_actor and p.active) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_target <> v_actor and not public.is_librarian() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_idempotency_key is not null then
    v_previous := public.claim_action_key(v_actor, p_idempotency_key, 'reserve_book');
    if v_previous is not null then
      select * into v_reservation from public.reservations where id = v_previous;
      return v_reservation;
    end if;
  end if;

  select p.graduating into v_graduating from public.profiles p where p.id = v_target and p.active for no key update;
  if not found then
    raise exception 'user_not_found' using hint = 'Usuário não encontrado ou inativo.';
  end if;
  perform 1 from public.books b where b.id = p_book_id for update;
  if not found then
    raise exception 'book_not_found' using hint = 'Livro não encontrado.';
  end if;

  perform public.promote_reservations(p_book_id);

  if exists (select 1 from public.reservations r
             where r.user_id = v_target and r.book_id = p_book_id and r.status in ('waiting', 'ready')) then
    raise exception 'already_reserved' using hint = 'Já existe uma reserva ativa deste livro.';
  end if;

  -- RF-15: atraso ou multa em aberto bloqueia (na reserva também, para não entrar na fila quem não poderá retirar).
  if exists (select 1 from public.loans l where l.user_id = v_target and l.returned_at is null and l.due_at < clock_timestamp())
     or exists (select 1 from public.fines f where f.user_id = v_target and f.paid_at is null) then
    raise exception 'user_has_pending' using hint = 'A pessoa tem atraso ou multa em aberto.';
  end if;

  -- RF-14: quem já está no limite de livros não poderia retirar este; não entra na fila.
  if (select count(*) from public.loans l where l.user_id = v_target and l.returned_at is null)
     >= public.loan_limit_for(coalesce(v_graduating, false)) then
    raise exception 'loan_limit_reached'
      using hint = format('O limite é de %s livros ao mesmo tempo.', public.loan_limit_for(coalesce(v_graduating, false)));
  end if;

  -- O gatilho reservations_enforce_integrity recusa livro inativo, livro já em mãos e livro com exemplar livre.
  -- created_at = hora em que a pessoa entrou na fila (já com o livro travado), não a de início da transação: define a ordem.
  insert into public.reservations (book_id, user_id, status, created_at)
  values (p_book_id, v_target, 'waiting', clock_timestamp())
  returning * into v_reservation;

  insert into public.audit_logs (actor_id, action, entity, entity_id, details)
  values (v_actor, 'reservation_created', 'reservations', v_reservation.id,
          jsonb_build_object('reservation_id', v_reservation.id, 'book_id', p_book_id, 'user_id', v_target));

  if p_idempotency_key is not null then
    update public.action_keys set entity_id = v_reservation.id where actor_id = v_actor and key = p_idempotency_key;
  end if;
  return v_reservation;
end;
$$;

-- ---------------------------------------------------------------------------------------------------------------------
-- 6. Cancelar (agora com chave de idempotência) e expirar
-- ---------------------------------------------------------------------------------------------------------------------

drop function public.cancel_reservation(uuid);

-- A dona da reserva ou a funcionária. Cancelar de novo não faz nada; reserva já cumprida (virou empréstimo) não se cancela.
create function public.cancel_reservation(p_reservation_id uuid, p_idempotency_key uuid default null)
returns public.reservations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_reservation public.reservations;
  v_book_id uuid;
begin
  if v_actor is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_idempotency_key is not null then
    if public.claim_action_key(v_actor, p_idempotency_key, 'cancel_reservation') is not null then
      select * into v_reservation from public.reservations where id = p_reservation_id;
      return v_reservation;
    end if;
  end if;

  select r.book_id into v_book_id from public.reservations r where r.id = p_reservation_id;
  if not found then
    raise exception 'reservation_not_found' using hint = 'Reserva não encontrada.';
  end if;
  perform 1 from public.books b where b.id = v_book_id for update;
  select * into v_reservation from public.reservations r where r.id = p_reservation_id for update;

  if not (public.is_librarian() or (v_reservation.user_id = v_actor
          and exists (select 1 from public.profiles p where p.id = v_actor and p.active))) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_reservation.status = 'cancelled' then
    return v_reservation;
  end if;
  if v_reservation.status = 'fulfilled' then
    raise exception 'reservation_already_fulfilled' using hint = 'Esta reserva já virou empréstimo.';
  end if;
  if v_reservation.status = 'expired' then
    raise exception 'reservation_expired' using hint = 'O prazo desta reserva já passou.';
  end if;

  update public.reservations set status = 'cancelled' where id = p_reservation_id returning * into v_reservation;

  insert into public.audit_logs (actor_id, action, entity, entity_id, details)
  values (v_actor, 'reservation_cancelled', 'reservations', v_reservation.id,
          jsonb_build_object('reservation_id', v_reservation.id, 'book_id', v_reservation.book_id, 'user_id', v_reservation.user_id));

  perform public.promote_reservations(v_reservation.book_id);

  if p_idempotency_key is not null then
    update public.action_keys set entity_id = v_reservation.id where actor_id = v_actor and key = p_idempotency_key;
  end if;
  return v_reservation;
end;
$$;

-- Só a funcionária: a pessoa não retirou o livro e a funcionária encerra a reserva pronta antes do prazo acabar.
create function public.expire_reservation(p_reservation_id uuid, p_idempotency_key uuid default null)
returns public.reservations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_reservation public.reservations;
  v_book_id uuid;
begin
  if not public.is_librarian() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_idempotency_key is not null then
    if public.claim_action_key(v_actor, p_idempotency_key, 'expire_reservation') is not null then
      select * into v_reservation from public.reservations where id = p_reservation_id;
      return v_reservation;
    end if;
  end if;

  select r.book_id into v_book_id from public.reservations r where r.id = p_reservation_id;
  if not found then
    raise exception 'reservation_not_found' using hint = 'Reserva não encontrada.';
  end if;
  perform 1 from public.books b where b.id = v_book_id for update;
  select * into v_reservation from public.reservations r where r.id = p_reservation_id for update;

  if v_reservation.status = 'expired' then
    return v_reservation;
  end if;
  if v_reservation.status <> 'ready' then
    raise exception 'reservation_not_ready' using hint = 'Só uma reserva pronta para retirada pode expirar.';
  end if;

  update public.reservations set status = 'expired' where id = p_reservation_id returning * into v_reservation;

  insert into public.audit_logs (actor_id, action, entity, entity_id, details)
  values (v_actor, 'reservation_expired', 'reservations', v_reservation.id,
          jsonb_build_object('reservation_id', v_reservation.id, 'book_id', v_reservation.book_id, 'user_id', v_reservation.user_id));

  perform public.promote_reservations(v_reservation.book_id);

  if p_idempotency_key is not null then
    update public.action_keys set entity_id = v_reservation.id where actor_id = v_actor and key = p_idempotency_key;
  end if;
  return v_reservation;
end;
$$;

revoke execute on function public.cancel_reservation(uuid, uuid) from public, anon;
revoke execute on function public.expire_reservation(uuid, uuid) from public, anon;
grant execute on function public.cancel_reservation(uuid, uuid) to authenticated;
grant execute on function public.expire_reservation(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------------------------------------------------
-- 7. Leituras para as telas
-- ---------------------------------------------------------------------------------------------------------------------

-- "Minhas reservas" (card 0216): só as da própria pessoa, as ativas primeiro, com a posição na fila (1 = próxima).
-- Reserva pronta tem posição 0. security definer porque a posição conta a fila inteira, que o RLS esconde; devolve só números.
create function public.list_my_reservations(p_limit integer default 50)
returns table (
  id uuid, book_id uuid, title text, author text, code text, cover_url text,
  status text, created_at timestamptz, ready_at timestamptz, expires_at timestamptz, queue_position integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.id, r.book_id, b.title, b.author, b.code, b.cover_url,
    r.status, r.created_at, r.ready_at, r.expires_at,
    case r.status
      when 'waiting' then (select count(*)::integer from public.reservations w
                           where w.book_id = r.book_id and w.status = 'waiting' and (w.created_at, w.id) <= (r.created_at, r.id))
      when 'ready' then 0
    end
  from public.reservations r
  join public.books b on b.id = r.book_id
  where r.user_id = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.active)
  order by (r.status in ('waiting', 'ready')) desc, r.created_at desc, r.id
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

-- Fila de um livro vista por quem está logado: tamanho da fila (só um número) e a situação da própria pessoa.
create function public.book_reservation_status(p_book_id uuid)
returns table (queue_size integer, my_reservation_id uuid, my_status text, my_position integer, my_expires_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*)::integer from public.reservations w where w.book_id = p_book_id and w.status in ('waiting', 'ready')),
    m.id,
    m.status,
    case m.status
      when 'waiting' then (select count(*)::integer from public.reservations w
                           where w.book_id = p_book_id and w.status = 'waiting' and (w.created_at, w.id) <= (m.created_at, m.id))
      when 'ready' then 0
    end,
    m.expires_at
  from (select 1) one
  left join lateral (
    select r.id, r.status, r.created_at, r.expires_at from public.reservations r
    where r.book_id = p_book_id and r.user_id = (select auth.uid()) and r.status in ('waiting', 'ready')
  ) m on true
  where exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.active);
$$;

revoke execute on function public.list_my_reservations(integer) from public, anon;
revoke execute on function public.book_reservation_status(uuid) from public, anon;
grant execute on function public.list_my_reservations(integer) to authenticated;
grant execute on function public.book_reservation_status(uuid) to authenticated;
