-- Migration: integridade e concorrência de empréstimo, devolução, renovação e reserva (card 0229, parte do 0225).
-- Objetivo: duas pessoas nunca pegam o último exemplar ao mesmo tempo, o limite de livros vale mesmo com cliques
-- simultâneos, e reserva e empréstimo não se atropelam. Prazo padrão de 7 dias; multa de R$ 1,00 por dia (PRD, RF-14 a RF-22).
--
-- Como está dividido:
--   1. Regras duras ficam em índices únicos e GATILHOS (valem até para quem gravar direto na tabela).
--   2. Funções (create_loan, return_loan, renew_loan, reserve_book, cancel_reservation) fazem o fluxo completo numa
--      transação: validam, gravam, registram a auditoria e aceitam uma chave de idempotência (clique duplo, retry de rede).
--   3. Bloqueio: toda escrita trava as linhas na MESMA ordem (usuário, livro, empréstimo/reserva). Ordem fixa evita deadlock;
--      o bloqueio do livro faz as requisições simultâneas do mesmo título entrarem em fila, uma por vez.
--
-- Erros: a mensagem da exceção é um código estável para o app mapear (ex.: loan_limit_reached) e o "hint" traz o texto em
-- português. Permissão negada usa o SQLSTATE 42501.
--
-- Atenção ao aplicar num banco com dados: os dois índices únicos falham se já houver duplicata. Confira antes:
--   select user_id, book_id, count(*) from public.loans where returned_at is null group by 1, 2 having count(*) > 1;
--   select user_id, book_id, count(*) from public.reservations where status in ('waiting','ready') group by 1, 2 having count(*) > 1;

-- ---------------------------------------------------------------------------------------------------------------------
-- 1. Regras de negócio em um lugar só
-- ---------------------------------------------------------------------------------------------------------------------

-- Formando pode ficar com 4 livros (PRD, RF-14). Só a bibliotecária altera (a policy de update de profiles já é só dela).
alter table public.profiles
  add column graduating boolean not null default false;

create function public.loan_period_days() returns integer language sql immutable set search_path = '' as $$ select 7 $$;
create function public.fine_cents_per_day() returns integer language sql immutable set search_path = '' as $$ select 100 $$;
create function public.loan_limit_for(p_graduating boolean) returns integer language sql immutable set search_path = ''
as $$ select case when p_graduating then 4 else 3 end $$;

revoke execute on function public.loan_period_days() from public, anon, authenticated;
revoke execute on function public.fine_cents_per_day() from public, anon, authenticated;
revoke execute on function public.loan_limit_for(boolean) from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------------------------------
-- 2. Índices únicos parciais: o banco recusa a duplicata, mesmo que duas requisições passem pela checagem ao mesmo tempo
-- ---------------------------------------------------------------------------------------------------------------------

-- Uma pessoa não tem dois empréstimos em aberto do mesmo livro.
create unique index loans_one_open_per_user_book on public.loans (user_id, book_id) where returned_at is null;

-- Uma pessoa não tem duas reservas ativas (aguardando ou pronta) do mesmo livro.
create unique index reservations_one_active_per_user_book on public.reservations (user_id, book_id)
  where status in ('waiting', 'ready');

-- ---------------------------------------------------------------------------------------------------------------------
-- 3. Gatilhos: limite, exemplar livre e reserva (valem para qualquer gravação em loans, books e reservations)
-- ---------------------------------------------------------------------------------------------------------------------

-- Os três gatilhos são "security definer": precisam enxergar TODOS os empréstimos e reservas (o RLS mostraria a cada pessoa
-- só os próprios e a contagem sairia errada) e chamar as funções de regra, que ninguém de fora executa.
--
-- Empréstimo novo em aberto: trava o usuário e o livro (nessa ordem) e confere limite, exemplar livre e reservas.
-- Esta função é "volátil" de propósito: cada consulta abaixo enxerga o que as requisições concorrentes já confirmaram.
-- Empréstimo já devolvido na inserção (histórico, seed) não passa por estas regras.
create function public.loans_enforce_integrity()
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
begin
  if tg_op = 'UPDATE' then
    -- Quem pegou e o que foi pego nunca mudam; um empréstimo devolvido não "desdevolve" (travaria a conta do limite).
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

  -- Ordem fixa de bloqueio: usuário, depois livro. "no key update" não atrapalha quem só referencia o perfil.
  select p.graduating into v_graduating from public.profiles p where p.id = new.user_id for no key update;
  select b.quantity into v_quantity from public.books b where b.id = new.book_id for update;

  select count(*) into v_user_open from public.loans l where l.user_id = new.user_id and l.returned_at is null;
  if v_user_open >= public.loan_limit_for(coalesce(v_graduating, false)) then
    raise exception 'loan_limit_reached'
      using hint = format('O limite é de %s livros ao mesmo tempo.', public.loan_limit_for(coalesce(v_graduating, false)));
  end if;

  select count(*) into v_book_open from public.loans l where l.book_id = new.book_id and l.returned_at is null;
  if v_book_open >= coalesce(v_quantity, 0) then
    raise exception 'no_copy_available' using hint = 'Não há exemplar livre deste livro.';
  end if;

  -- Exemplar guardado ("ready") para outra pessoa não pode ser levado por quem não reservou.
  select count(*) into v_ready_others from public.reservations r
  where r.book_id = new.book_id and r.status = 'ready' and r.user_id <> new.user_id;
  if v_quantity - v_book_open - v_ready_others < 1 then
    raise exception 'copy_reserved_for_others' using hint = 'O exemplar livre está reservado para outra pessoa.';
  end if;

  return new;
end;
$$;

create trigger loans_enforce_integrity
  before insert or update on public.loans
  for each row execute function public.loans_enforce_integrity();

revoke execute on function public.loans_enforce_integrity() from public, anon, authenticated;

-- Não deixa baixar a quantidade de exemplares para menos que os empréstimos em aberto.
-- Trava o livro antes de contar: um empréstimo concorrente termina antes (ou espera esta edição).
create function public.books_enforce_quantity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.quantity < old.quantity then
    perform 1 from public.books b where b.id = new.id for update;
    if (select count(*) from public.loans l where l.book_id = new.id and l.returned_at is null) > new.quantity then
      raise exception 'quantity_below_open_loans'
        using hint = 'Há mais empréstimos em aberto do que a nova quantidade de exemplares.';
    end if;
  end if;
  return new;
end;
$$;

create trigger books_enforce_quantity
  before update of quantity on public.books
  for each row execute function public.books_enforce_quantity();

revoke execute on function public.books_enforce_quantity() from public, anon, authenticated;

-- Reserva nova: só de livro ativo e sem exemplar livre (RF-13), e não de livro que a pessoa já está lendo.
-- "Exemplar livre" desconta os que já estão guardados para a fila ("ready").
create function public.reservations_enforce_integrity()
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

  -- Só na criação: promover a fila (waiting -> ready) é uma atualização e não pode ser barrada por haver exemplar livre.
  if tg_op = 'INSERT' then
    select count(*) into v_open from public.loans l where l.book_id = new.book_id and l.returned_at is null;
    select count(*) into v_ready from public.reservations r where r.book_id = new.book_id and r.status = 'ready';
    if v_quantity - v_open - v_ready >= 1 then
      raise exception 'book_available' using hint = 'Há exemplar livre: faça o empréstimo em vez de reservar.';
    end if;
  end if;

  return new;
end;
$$;

create trigger reservations_enforce_integrity
  before insert on public.reservations
  for each row execute function public.reservations_enforce_integrity();

revoke execute on function public.reservations_enforce_integrity() from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------------------------------
-- 4. Idempotência: a mesma chave não repete a ação
-- ---------------------------------------------------------------------------------------------------------------------

-- O app gera uma chave (uuid) por ação na tela e a reenvia no clique duplo ou no retry. Ninguém lê nem grava esta
-- tabela pela API: só as funções abaixo (security definer). Limpeza de chaves antigas: tarefa agendada do card 0231.
create table public.action_keys (
  actor_id uuid not null references public.profiles (id) on delete cascade,
  key uuid not null,
  action text not null,
  entity_id uuid,                       -- o que a ação produziu (empréstimo ou reserva), para devolver o mesmo resultado
  created_at timestamptz not null default now(),
  primary key (actor_id, key)
);

create index idx_action_keys_created_at on public.action_keys (created_at);

alter table public.action_keys enable row level security;
revoke all on public.action_keys from anon, authenticated;

-- Registra a chave. Devolve o resultado guardado se a chave já foi usada com sucesso; nulo se é a primeira vez.
-- Se outra requisição com a mesma chave ainda está rodando, o insert espera ela terminar (índice único) e enxerga o resultado.
create function public.claim_action_key(p_actor uuid, p_key uuid, p_action text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_action text;
  v_entity uuid;
begin
  insert into public.action_keys (actor_id, key, action) values (p_actor, p_key, p_action)
  on conflict (actor_id, key) do nothing;
  if found then
    return null;
  end if;
  select k.action, k.entity_id into v_action, v_entity from public.action_keys k where k.actor_id = p_actor and k.key = p_key;
  if v_action is distinct from p_action then
    raise exception 'idempotency_key_reused' using hint = 'Esta chave já foi usada em outra ação.';
  end if;
  return v_entity;
end;
$$;

revoke execute on function public.claim_action_key(uuid, uuid, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------------------------------
-- 5. Fila de reservas
-- ---------------------------------------------------------------------------------------------------------------------

-- Passa para "pronta" (exemplar guardado) as reservas mais antigas, enquanto houver exemplar livre.
-- Quem chama precisa já ter o livro travado (for update).
create function public.promote_reservations(p_book_id uuid)
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

revoke execute on function public.promote_reservations(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------------------------------
-- 6. Funções do fluxo (chamadas pelo app via RPC)
-- ---------------------------------------------------------------------------------------------------------------------

-- Empréstimo: só a bibliotecária registra. Prazo de 7 dias. Cumpre a reserva da pessoa, se houver.
create function public.create_loan(p_book_id uuid, p_user_id uuid, p_idempotency_key uuid default null)
returns public.loans
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_loan public.loans;
  v_previous uuid;
  v_user_active boolean;
  v_book_status text;
  v_now timestamptz;
begin
  if not public.is_librarian() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_idempotency_key is not null then
    v_previous := public.claim_action_key(v_actor, p_idempotency_key, 'create_loan');
    if v_previous is not null then
      select * into v_loan from public.loans where id = v_previous;
      return v_loan;
    end if;
  end if;

  -- Ordem de bloqueio: usuário, depois livro (a mesma do gatilho).
  select p.active into v_user_active from public.profiles p where p.id = p_user_id for no key update;
  if not found then
    raise exception 'user_not_found' using hint = 'Usuário não encontrado.';
  end if;
  if not v_user_active then
    raise exception 'user_inactive' using hint = 'Usuário inativo não pode pegar livros.';
  end if;

  select b.status into v_book_status from public.books b where b.id = p_book_id for update;
  if not found then
    raise exception 'book_not_found' using hint = 'Livro não encontrado.';
  end if;
  if v_book_status <> 'active' then
    raise exception 'book_inactive' using hint = 'Este livro não está disponível no acervo.';
  end if;

  perform public.promote_reservations(p_book_id);

  -- RF-15: empréstimo vencido ou multa em aberto bloqueia um novo empréstimo.
  if exists (select 1 from public.loans l where l.user_id = p_user_id and l.returned_at is null and l.due_at < clock_timestamp())
     or exists (select 1 from public.fines f where f.user_id = p_user_id and f.paid_at is null) then
    raise exception 'user_has_pending' using hint = 'A pessoa tem atraso ou multa em aberto.';
  end if;

  if exists (select 1 from public.loans l where l.user_id = p_user_id and l.book_id = p_book_id and l.returned_at is null) then
    raise exception 'already_borrowed' using hint = 'A pessoa já está com este livro.';
  end if;

  v_now := clock_timestamp();
  -- O gatilho loans_enforce_integrity confere limite, exemplar livre e reservas de outras pessoas.
  insert into public.loans (book_id, user_id, borrowed_at, due_at, created_by)
  values (p_book_id, p_user_id, v_now, v_now + make_interval(days => public.loan_period_days()), v_actor)
  returning * into v_loan;

  update public.reservations r set status = 'fulfilled'
  where r.user_id = p_user_id and r.book_id = p_book_id and r.status in ('waiting', 'ready');

  insert into public.audit_logs (actor_id, action, entity, entity_id, details)
  values (v_actor, 'loan_created', 'loans', v_loan.id,
          jsonb_build_object('loan_id', v_loan.id, 'book_id', p_book_id, 'user_id', p_user_id));

  if p_idempotency_key is not null then
    update public.action_keys set entity_id = v_loan.id where actor_id = v_actor and key = p_idempotency_key;
  end if;
  return v_loan;
end;
$$;

-- Devolução: só a bibliotecária. Registra a multa se passou do prazo (R$ 1,00 por dia) e passa o exemplar para a fila.
-- Dias de atraso = dias corridos entre o dia do prazo e o dia da devolução, no fuso de Brasília (devolver no dia do
-- prazo, mesmo depois da hora do empréstimo, não gera multa). Devolver de novo o mesmo empréstimo não faz nada.
create function public.return_loan(p_loan_id uuid, p_idempotency_key uuid default null)
returns public.loans
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_loan public.loans;
  v_book_id uuid;
  v_now timestamptz;
  v_days_late integer;
  v_fine_id uuid;
  v_fine_is_new boolean;
begin
  if not public.is_librarian() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_idempotency_key is not null then
    if public.claim_action_key(v_actor, p_idempotency_key, 'return_loan') is not null then
      select * into v_loan from public.loans where id = p_loan_id;
      return v_loan;
    end if;
  end if;

  -- Livro primeiro, depois o empréstimo (a ordem de bloqueio é a mesma em todas as funções).
  select l.book_id into v_book_id from public.loans l where l.id = p_loan_id;
  if not found then
    raise exception 'loan_not_found' using hint = 'Empréstimo não encontrado.';
  end if;
  perform 1 from public.books b where b.id = v_book_id for update;
  select * into v_loan from public.loans l where l.id = p_loan_id for update;

  if v_loan.returned_at is not null then
    return v_loan;
  end if;

  v_now := clock_timestamp();
  update public.loans set returned_at = v_now where id = p_loan_id returning * into v_loan;

  insert into public.audit_logs (actor_id, action, entity, entity_id, details)
  values (v_actor, 'loan_returned', 'loans', v_loan.id,
          jsonb_build_object('loan_id', v_loan.id, 'book_id', v_loan.book_id, 'user_id', v_loan.user_id));

  v_days_late := (v_now at time zone 'America/Sao_Paulo')::date - (v_loan.due_at at time zone 'America/Sao_Paulo')::date;
  if v_days_late > 0 then
    -- A tarefa diária de multas já pode ter criado a multa deste empréstimo ainda em aberto (cresce 1 dia por dia).
    -- Na devolução o valor final vale: atualiza dias e valor, a não ser que a baixa do pagamento já tenha sido dada.
    -- "xmax = 0" só é verdadeiro para linha inserida agora; o registro "fine_created" é só da multa nova.
    insert into public.fines (loan_id, user_id, days_late, amount_cents)
    values (v_loan.id, v_loan.user_id, v_days_late, v_days_late * public.fine_cents_per_day())
    on conflict (loan_id) do update
      set days_late = excluded.days_late, amount_cents = excluded.amount_cents
      where public.fines.paid_at is null
    returning id, (xmax = 0) into v_fine_id, v_fine_is_new;
    if v_fine_id is not null and v_fine_is_new then
      insert into public.audit_logs (actor_id, action, entity, entity_id, details)
      values (v_actor, 'fine_created', 'fines', v_fine_id, jsonb_build_object('fine_id', v_fine_id, 'loan_id', v_loan.id));
    end if;
  end if;

  perform public.promote_reservations(v_loan.book_id);

  if p_idempotency_key is not null then
    update public.action_keys set entity_id = v_loan.id where actor_id = v_actor and key = p_idempotency_key;
  end if;
  return v_loan;
end;
$$;

-- Renovação: a bibliotecária ou a própria pessoa. Mais 7 dias a partir de hoje (nunca menos que o prazo atual).
-- Não renova empréstimo vencido, nem livro que outra pessoa reservou. Não há limite de renovações no PRD: se a
-- biblioteca quiser um (ex.: 2), é só conferir loans.renewals aqui.
create function public.renew_loan(p_loan_id uuid, p_idempotency_key uuid default null)
returns public.loans
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_loan public.loans;
  v_book_id uuid;
  v_now timestamptz;
begin
  if p_idempotency_key is not null then
    if public.claim_action_key(v_actor, p_idempotency_key, 'renew_loan') is not null then
      select * into v_loan from public.loans where id = p_loan_id;
      return v_loan;
    end if;
  end if;

  select l.book_id into v_book_id from public.loans l where l.id = p_loan_id;
  if not found then
    raise exception 'loan_not_found' using hint = 'Empréstimo não encontrado.';
  end if;
  perform 1 from public.books b where b.id = v_book_id for update;
  select * into v_loan from public.loans l where l.id = p_loan_id for update;

  if not (public.is_librarian() or (v_loan.user_id = v_actor
          and exists (select 1 from public.profiles p where p.id = v_actor and p.active))) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_loan.returned_at is not null then
    raise exception 'loan_already_returned' using hint = 'Este empréstimo já foi devolvido.';
  end if;

  v_now := clock_timestamp();
  if v_loan.due_at < v_now then
    raise exception 'loan_overdue' using hint = 'Empréstimo vencido não pode ser renovado: devolva o livro.';
  end if;
  if exists (select 1 from public.reservations r
             where r.book_id = v_loan.book_id and r.user_id <> v_loan.user_id and r.status in ('waiting', 'ready')) then
    raise exception 'book_has_reservations' using hint = 'Outra pessoa reservou este livro.';
  end if;

  update public.loans
  set due_at = greatest(v_loan.due_at, v_now + make_interval(days => public.loan_period_days())),
      renewals = renewals + 1
  where id = p_loan_id
  returning * into v_loan;

  insert into public.audit_logs (actor_id, action, entity, entity_id, details)
  values (v_actor, 'loan_renewed', 'loans', v_loan.id,
          jsonb_build_object('loan_id', v_loan.id, 'book_id', v_loan.book_id, 'user_id', v_loan.user_id));

  if p_idempotency_key is not null then
    update public.action_keys set entity_id = v_loan.id where actor_id = v_actor and key = p_idempotency_key;
  end if;
  return v_loan;
end;
$$;

-- Reserva de livro sem exemplar livre: a própria pessoa (p_user_id nulo) ou a bibliotecária por ela.
create function public.reserve_book(p_book_id uuid, p_user_id uuid default null, p_idempotency_key uuid default null)
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

  perform 1 from public.profiles p where p.id = v_target and p.active for no key update;
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

  -- O gatilho reservations_enforce_integrity recusa livro inativo, livro já em mãos e livro com exemplar livre.
  insert into public.reservations (book_id, user_id, status) values (p_book_id, v_target, 'waiting')
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

-- Cancelamento: a dona da reserva ou a bibliotecária. Libera o exemplar guardado para a próxima da fila.
-- Cancelar de novo a mesma reserva não faz nada; reserva já cumprida (virou empréstimo) não se cancela.
create function public.cancel_reservation(p_reservation_id uuid)
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

  update public.reservations set status = 'cancelled' where id = p_reservation_id returning * into v_reservation;

  insert into public.audit_logs (actor_id, action, entity, entity_id, details)
  values (v_actor, 'reservation_cancelled', 'reservations', v_reservation.id,
          jsonb_build_object('reservation_id', v_reservation.id, 'book_id', v_reservation.book_id, 'user_id', v_reservation.user_id));

  perform public.promote_reservations(v_reservation.book_id);
  return v_reservation;
end;
$$;

-- Só quem está logado chama as cinco funções; cada uma confere o papel por dentro.
revoke execute on function public.create_loan(uuid, uuid, uuid) from public, anon;
revoke execute on function public.return_loan(uuid, uuid) from public, anon;
revoke execute on function public.renew_loan(uuid, uuid) from public, anon;
revoke execute on function public.reserve_book(uuid, uuid, uuid) from public, anon;
revoke execute on function public.cancel_reservation(uuid) from public, anon;
grant execute on function public.create_loan(uuid, uuid, uuid) to authenticated;
grant execute on function public.return_loan(uuid, uuid) to authenticated;
grant execute on function public.renew_loan(uuid, uuid) to authenticated;
grant execute on function public.reserve_book(uuid, uuid, uuid) to authenticated;
grant execute on function public.cancel_reservation(uuid) to authenticated;
