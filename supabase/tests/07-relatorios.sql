-- Testes dos relatórios da bibliotecária (cards 0070 a 0073 e 0154 a 0156): report_overdue, report_inventory,
-- report_pedagogical e report_pedagogical_counts.
-- Rode num Postgres de teste, em banco novo, depois de aplicar TODAS as migrations (inclui 20261113300000):
-- veja docs/database/modelo-de-dados.md. Cada linha mostra PASS ou FAIL.

insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-0000000000f1','a1@x.com','{"full_name":"Aluno Um"}'),
 ('00000000-0000-0000-0000-0000000000f2','a2@x.com','{"full_name":"Aluno Dois"}'),
 ('00000000-0000-0000-0000-0000000000f5','p1@x.com','{"full_name":"Professor Um"}'),
 ('00000000-0000-0000-0000-0000000000f6','p2@x.com','{"full_name":"Professor Dois"}'),
 ('00000000-0000-0000-0000-0000000000fa','lib@x.com','{"full_name":"Bibliotecária"}');
update public.profiles set role = 'librarian', job_title = 'Auxiliar' where id = '00000000-0000-0000-0000-0000000000fa';
update public.profiles set role = 'teacher' where id in ('00000000-0000-0000-0000-0000000000f5','00000000-0000-0000-0000-0000000000f6');

create function pg_temp.as_user(u text) returns void language plpgsql as $$
begin perform set_config('role','authenticated',true); perform set_config('request.jwt.claim.sub',u,true); end $$;
create function pg_temp.as_anon() returns void language plpgsql as $$
begin perform set_config('role','anon',true); perform set_config('request.jwt.claim.sub','',true); end $$;
create function pg_temp.say(n text, ok boolean) returns void language plpgsql as $$
begin raise notice '% %', case when ok then 'PASS ' else 'FAIL ' end, n; end $$;
create function pg_temp.err(cmd text) returns text language plpgsql as $$
begin execute cmd; return 'ok'; exception when others then return sqlerrm; end $$;

-- Categorias: Ficção (2 ativos + 1 inativo), Ciência (1 ativo), sem categoria (1 ativo).
insert into public.books (id, title, author, code, category, quantity, status) values
 ('b0000000-0000-0000-0000-0000000000a1','Dom Casmurro','Machado','R-001','Ficção',5,'active'),
 ('b0000000-0000-0000-0000-0000000000a2','Iracema','Alencar','R-002','Ficção',3,'active'),
 ('b0000000-0000-0000-0000-0000000000a3','Livro antigo','Autor','R-003','Ficção',4,'inactive'),
 ('b0000000-0000-0000-0000-0000000000a4','Cosmos','Sagan','R-004','Ciência',2,'active'),
 ('b0000000-0000-0000-0000-0000000000a5','Sem tema','Autor','R-005',null,1,'active');

-- Empréstimo cujo prazo cai às HH:MM (Brasília) de hoje + N dias; returned_days = devolvido hoje + N dias (nulo = em aberto).
create function pg_temp.loan(p_user text, p_book uuid, p_days int, p_time time, p_ret_days int default null) returns uuid
language plpgsql as $$
declare v_id uuid; v_due timestamptz; v_ret timestamptz;
begin
  v_due := (((now() at time zone 'America/Sao_Paulo')::date + p_days) + p_time) at time zone 'America/Sao_Paulo';
  if p_ret_days is not null then
    v_ret := (((now() at time zone 'America/Sao_Paulo')::date + p_ret_days) + time '12:00') at time zone 'America/Sao_Paulo';
  end if;
  insert into public.loans (book_id, user_id, borrowed_at, due_at, returned_at)
  values (p_book, p_user::uuid, v_due - interval '20 days', v_due, v_ret) returning id into v_id;
  return v_id;
end $$;

do $$
declare
  A1 text:='00000000-0000-0000-0000-0000000000f1'; A2 text:='00000000-0000-0000-0000-0000000000f2';
  P1 text:='00000000-0000-0000-0000-0000000000f5'; P2 text:='00000000-0000-0000-0000-0000000000f6';
  LIB text:='00000000-0000-0000-0000-0000000000fa';
  b1 uuid:='b0000000-0000-0000-0000-0000000000a1'; b2 uuid:='b0000000-0000-0000-0000-0000000000a2';
  b4 uuid:='b0000000-0000-0000-0000-0000000000a4';
  r record; n int;
  today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  -- Relatórios vazios.
  perform pg_temp.as_user(LIB);
  select count(*) into n from public.report_overdue();
  perform pg_temp.say('sem empréstimos: atraso vazio', n = 0);
  select * into r from public.report_inventory(10, 0) limit 1;
  perform pg_temp.say('sem empréstimos: acervo já lista a categoria Ciência primeiro (ordem alfabética)', r.category = 'Ciência');

  perform set_config('role','postgres',true);
  -- Em aberto: 4 dias de atraso (prazo há 4 dias 10:00), 1 dia (ontem 23:59), prazo HOJE 00:00 (não é atraso) e futuro.
  perform pg_temp.loan(A1, b1, -4, '10:00');
  perform pg_temp.loan(A2, b2, -1, '23:59');
  perform pg_temp.loan(A1, b2, 0, '00:00');
  perform pg_temp.loan(A2, b4, 5, '12:00');
  -- Devolvidos: prazo há 10 dias, devolvido há 7 = 3 dias de atraso; prazo há 3 dias 23:59, devolvido no dia seguinte
  -- (dia seguinte = 1 dia); devolvido no dia do prazo (0 dia = não é atraso).
  perform pg_temp.loan(A2, b1, -10, '12:00', -7);
  perform pg_temp.loan(A1, b4, -3, '23:59', -2);
  perform pg_temp.loan(A1, b4, -2, '08:00', -2);

  perform pg_temp.as_user(LIB);

  -- Padrão: em atraso, ainda não devolvidos.
  select count(*) into n from public.report_overdue();
  perform pg_temp.say('em atraso (padrão): 2 empréstimos (hoje 00:00 e o futuro ficam de fora)', n = 2);
  select * into r from public.report_overdue() limit 1;
  perform pg_temp.say('o mais atrasado vem primeiro: 4 dias, multa de R$ 4,00', r.days_late = 4 and r.fine_cents = 400 and r.book_title = 'Dom Casmurro');
  perform pg_temp.say('traz usuário e tombo do livro', r.user_name = 'Aluno Um' and r.book_code = 'R-001' and r.returned_on is null);
  perform pg_temp.say('totais do filtro inteiro: 2 registros, R$ 5,00', r.total_count = 2 and r.total_fine_cents = 500);

  select * into r from public.report_overdue(null, null, 'returned') limit 1;
  perform pg_temp.say('devolvidos com atraso: o de 3 dias primeiro, multa R$ 3,00', r.days_late = 3 and r.fine_cents = 300 and r.returned_on = today - 7);
  select count(*) into n from public.report_overdue(null, null, 'returned');
  perform pg_temp.say('devolvidos com atraso: 2 (devolver no dia do prazo não conta)', n = 2);
  select * into r from public.report_overdue(null, null, 'all') limit 1;
  perform pg_temp.say('todos: 4 registros, R$ 9,00 (4+1+3+1 dias)', r.total_count = 4 and r.total_fine_cents = 900);

  -- Período pelo dia do prazo (inclusive nos dois lados).
  select count(*) into n from public.report_overdue(today - 4, today - 4, 'all');
  perform pg_temp.say('período de um dia só (hoje-4) acha 1 prazo', n = 1);
  select count(*) into n from public.report_overdue(today - 3, null, 'all');
  perform pg_temp.say('só data inicial (hoje-3): prazos hoje-3 e hoje-1', n = 2);
  select count(*) into n from public.report_overdue(null, today - 5, 'all');
  perform pg_temp.say('só data final (hoje-5): o prazo de hoje-10', n = 1);
  select count(*) into n from public.report_overdue(today, today - 1, 'all');
  perform pg_temp.say('período invertido não acha nada (a tela avisa antes)', n = 0);

  -- Paginação e limites.
  select count(*) into n from public.report_overdue(null, null, 'all', 3, 0);
  perform pg_temp.say('limite 3 devolve 3 linhas', n = 3);
  select count(*) into n from public.report_overdue(null, null, 'all', 3, 3);
  perform pg_temp.say('segunda página (offset 3) devolve a 1 linha que sobra', n = 1);
  select count(*) into n from public.report_overdue(null, null, 'all', 0, 0);
  perform pg_temp.say('limite 0 vale no mínimo 1', n = 1);
  perform pg_temp.say('situação desconhecida é recusada', pg_temp.err($q$select * from public.report_overdue(null, null, 'x')$q$) = 'invalid_status');

  -- Acervo: Ciência: 1 título, 2 exemplares, 1 emprestado (empréstimo em aberto de b4), 1 disponível; devolvidos não contam.
  select * into r from public.report_inventory(10, 0) where category = 'Ciência';
  perform pg_temp.say('acervo Ciência: 1 título, 2 exemplares, 1 emprestado, 1 disponível',
    r.titles = 1 and r.copies = 2 and r.borrowed = 1 and r.held = 0 and r.available = 1);
  select * into r from public.report_inventory(10, 0) where category = 'Ficção';
  perform pg_temp.say('acervo Ficção: 2 ativos (8 exemplares, 3 emprestados, 5 livres) e 1 inativo (4 exemplares)',
    r.titles = 2 and r.copies = 8 and r.borrowed = 3 and r.available = 5 and r.inactive_titles = 1 and r.inactive_copies = 4);
  select * into r from public.report_inventory(10, 0) where category = 'Sem categoria';
  perform pg_temp.say('livro sem categoria entra como "Sem categoria"', r.titles = 1 and r.copies = 1 and r.available = 1);
  select * into r from public.report_inventory(10, 0) limit 1;
  perform pg_temp.say('totais do acervo: 3 categorias, 4 títulos, 11 exemplares, 4 emprestados, 7 livres, 4 inativos',
    r.total_count = 3 and r.sum_titles = 4 and r.sum_copies = 11 and r.sum_borrowed = 4 and r.sum_available = 7 and r.sum_inactive_copies = 4);
  select category into r from public.report_inventory(10, 0) offset 2 limit 1;
  perform pg_temp.say('"Sem categoria" fica por último', r.category = 'Sem categoria');
  select count(*) into n from public.report_inventory(1, 1);
  perform pg_temp.say('paginação do acervo (limite 1, offset 1) devolve 1 linha', n = 1);

  -- Reservas pedagógicas: aprovada guarda 1 exemplar de cada livro.
  perform set_config('role','postgres',true);
  insert into public.pedagogical_reservations (id, teacher_id, start_date, days, status, purpose, created_at) values
    ('c0000000-0000-0000-0000-000000000001', P1::uuid, today + 5, 10, 'approved', '8º ano A', now() - interval '3 days'),
    ('c0000000-0000-0000-0000-000000000002', P1::uuid, today + 6, 10, 'pending', null, now() - interval '2 days'),
    ('c0000000-0000-0000-0000-000000000003', P2::uuid, today + 7, 5, 'pending', null, now() - interval '40 days');
  update public.pedagogical_reservations set status = 'rejected', decision_note = 'sem exemplares' where id = 'c0000000-0000-0000-0000-000000000003';
  insert into public.pedagogical_reservation_books (reservation_id, book_id) values
    ('c0000000-0000-0000-0000-000000000001', b1), ('c0000000-0000-0000-0000-000000000001', b4),
    ('c0000000-0000-0000-0000-000000000002', b2), ('c0000000-0000-0000-0000-000000000003', b2);

  perform pg_temp.as_user(LIB);
  select count(*) into n from public.report_pedagogical();
  perform pg_temp.say('reservas: 3 no total', n = 3);
  select * into r from public.report_pedagogical() limit 1;
  perform pg_temp.say('mais recente primeiro: a pendente de 2 dias atrás, com professor e livro',
    r.reservation_id = 'c0000000-0000-0000-0000-000000000002' and r.teacher_name = 'Professor Um' and r.book_titles = array['Iracema'] and r.total_count = 3);
  select * into r from public.report_pedagogical(null, null, 'approved');
  perform pg_temp.say('situação aprovada: 1 reserva com 2 livros em ordem alfabética e disciplina',
    r.book_count = 2 and r.book_titles = array['Cosmos','Dom Casmurro'] and r.purpose = '8º ano A' and r.total_count = 1);
  select count(*) into n from public.report_pedagogical(today - 7, today, 'all');
  perform pg_temp.say('período dos últimos 7 dias deixa a de 40 dias atrás de fora', n = 2);
  select count(*) into n from public.report_pedagogical(null, today - 30, 'all');
  perform pg_temp.say('só data final (30 dias atrás): a recusada de 40 dias', n = 1);
  perform pg_temp.say('situação desconhecida é recusada', pg_temp.err($q$select * from public.report_pedagogical(null, null, 'x')$q$) = 'invalid_status');

  select count(*) into n from public.report_pedagogical_counts() c where (c.status, c.total) in (('pending', 1), ('approved', 1), ('rejected', 1));
  perform pg_temp.say('contagem por situação: 1 pendente, 1 aprovada e 1 recusada', n = 3);
  select count(*) into n from public.report_pedagogical_counts(today - 7, today);
  perform pg_temp.say('contagem respeita o período (só pending e approved nos últimos 7 dias)', n = 2);

  -- A aprovada guarda 1 exemplar de b1 e de b4: o acervo mostra reservados e desconta dos disponíveis.
  select * into r from public.report_inventory(10, 0) where category = 'Ciência';
  perform pg_temp.say('acervo Ciência com reserva aprovada: 1 reservado, 0 disponível', r.held = 1 and r.available = 0);
  select * into r from public.report_inventory(10, 0) where category = 'Ficção';
  perform pg_temp.say('acervo Ficção com reserva aprovada: 1 reservado, 4 livres', r.held = 1 and r.available = 4);

  -- Acesso: só a bibliotecária.
  perform pg_temp.as_user(A1);
  perform pg_temp.say('aluno NÃO lê atraso', pg_temp.err('select * from public.report_overdue()') = 'forbidden');
  perform pg_temp.say('aluno NÃO lê acervo', pg_temp.err('select * from public.report_inventory()') = 'forbidden');
  perform pg_temp.say('aluno NÃO lê reservas', pg_temp.err('select * from public.report_pedagogical()') = 'forbidden');
  perform pg_temp.say('aluno NÃO lê contagem de reservas', pg_temp.err('select * from public.report_pedagogical_counts()') = 'forbidden');
  perform pg_temp.as_user(P1);
  perform pg_temp.say('professor NÃO lê atraso', pg_temp.err('select * from public.report_overdue()') = 'forbidden');
  perform pg_temp.say('professor NÃO lê reservas', pg_temp.err('select * from public.report_pedagogical()') = 'forbidden');
  perform pg_temp.as_anon();
  perform pg_temp.say('anônimo NÃO executa atraso', pg_temp.err('select * from public.report_overdue()') like 'permission denied%');
  perform pg_temp.say('anônimo NÃO executa acervo', pg_temp.err('select * from public.report_inventory()') like 'permission denied%');
  perform pg_temp.say('anônimo NÃO executa reservas', pg_temp.err('select * from public.report_pedagogical()') like 'permission denied%');
  perform pg_temp.say('anônimo NÃO executa contagem', pg_temp.err('select * from public.report_pedagogical_counts()') like 'permission denied%');
  perform set_config('role','postgres',true);
end $$;

-- Índices de apoio existem (o plano usa índice nas consultas por prazo, sem varrer a tabela de empréstimos).
select pg_temp.say('índice dos atrasados em aberto existe', exists (select 1 from pg_indexes where indexname = 'idx_loans_open_by_due'));
select pg_temp.say('índice dos devolvidos com atraso existe', exists (select 1 from pg_indexes where indexname = 'idx_loans_returned_late'));
select pg_temp.say('índice do acervo por categoria existe', exists (select 1 from pg_indexes where indexname = 'idx_books_category_status_qty'));
