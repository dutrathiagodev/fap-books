-- Testes de panel_summary() (cards 0097, 0158 e 0094): contadores do painel da bibliotecária.
-- Rode num Postgres de teste, em banco novo, depois de aplicar TODAS as migrations (inclui 20261108190000):
-- veja docs/database/modelo-de-dados.md. Cada linha mostra PASS ou FAIL.

insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-0000000000f1','a1@x.com','{"full_name":"Aluno Um"}'),
 ('00000000-0000-0000-0000-0000000000f2','a2@x.com','{"full_name":"Aluno Dois"}'),
 ('00000000-0000-0000-0000-0000000000f3','a3@x.com','{"full_name":"Aluno Três"}'),
 ('00000000-0000-0000-0000-0000000000f4','a4@x.com','{"full_name":"Aluno Quatro"}'),
 ('00000000-0000-0000-0000-0000000000f5','p1@x.com','{"full_name":"Professor Um"}'),
 ('00000000-0000-0000-0000-0000000000fa','lib@x.com','{"full_name":"Bibliotecária"}');
update public.profiles set role = 'librarian', job_title = 'Auxiliar' where id = '00000000-0000-0000-0000-0000000000fa';
update public.profiles set role = 'teacher' where id = '00000000-0000-0000-0000-0000000000f5';

create function pg_temp.as_user(u text) returns void language plpgsql as $$
begin perform set_config('role','authenticated',true); perform set_config('request.jwt.claim.sub',u,true); end $$;
create function pg_temp.as_anon() returns void language plpgsql as $$
begin perform set_config('role','anon',true); perform set_config('request.jwt.claim.sub','',true); end $$;
create function pg_temp.say(n text, ok boolean) returns void language plpgsql as $$
begin raise notice '% %', case when ok then 'PASS ' else 'FAIL ' end, n; end $$;
create function pg_temp.err(cmd text) returns text language plpgsql as $$
begin execute cmd; return 'ok'; exception when others then return sqlerrm; end $$;

insert into public.books (id, title, author, code, quantity) values
 ('b0000000-0000-0000-0000-0000000000a1','Livro 1','Autor','P-001',10),
 ('b0000000-0000-0000-0000-0000000000a2','Livro 2','Autor','P-002',10),
 ('b0000000-0000-0000-0000-0000000000a3','Livro 3','Autor','P-003',10),
 ('b0000000-0000-0000-0000-0000000000a4','Livro 4','Autor','P-004',10);
-- Livro inativo: os exemplares dele não entram em "disponíveis".
insert into public.books (id, title, author, code, quantity, status) values
 ('b0000000-0000-0000-0000-0000000000a5','Livro inativo','Autor','P-005',5,'inactive');

-- Empréstimo cujo prazo cai às HH:MM (Brasília) de hoje + N dias (N negativo = atrasado). returned: já devolvido.
create function pg_temp.loan(p_user text, p_book uuid, p_days int, p_time time, p_returned boolean default false) returns uuid
language plpgsql as $$
declare v_id uuid; v_due timestamptz;
begin
  v_due := (((now() at time zone 'America/Sao_Paulo')::date + p_days) + p_time) at time zone 'America/Sao_Paulo';
  insert into public.loans (book_id, user_id, borrowed_at, due_at, returned_at)
  values (p_book, p_user::uuid, v_due - interval '7 days', v_due, case when p_returned then now() end) returning id into v_id;
  return v_id;
end $$;

do $$
declare
  A1 text:='00000000-0000-0000-0000-0000000000f1'; A2 text:='00000000-0000-0000-0000-0000000000f2';
  A3 text:='00000000-0000-0000-0000-0000000000f3'; A4 text:='00000000-0000-0000-0000-0000000000f4';
  P1 text:='00000000-0000-0000-0000-0000000000f5'; LIB text:='00000000-0000-0000-0000-0000000000fa';
  b1 uuid:='b0000000-0000-0000-0000-0000000000a1'; b2 uuid:='b0000000-0000-0000-0000-0000000000a2';
  b3 uuid:='b0000000-0000-0000-0000-0000000000a3'; b4 uuid:='b0000000-0000-0000-0000-0000000000a4';
  r record; l1 uuid; l2 uuid; l3 uuid; res uuid;
begin
  -- Sem nada emprestado, o painel zera (só os exemplares disponíveis aparecem: 4 livros ativos x 10).
  perform pg_temp.as_user(LIB);
  select * into r from public.panel_summary();
  perform pg_temp.say('painel vazio: tudo zerado e 40 exemplares livres',
    r.borrowed = 0 and r.overdue = 0 and r.due_today = 0 and r.due_soon = 0 and r.available_copies = 40
    and r.open_fines = 0 and r.open_fines_cents = 0 and r.pending_pedagogical = 0);

  perform set_config('role','postgres',true);
  -- Atrasados: prazo de ontem 23:59 e de 3 dias atrás.
  perform pg_temp.loan(A1, b1, -1, '23:59');
  perform pg_temp.loan(A1, b2, -3, '10:00');
  -- Hoje: 00:00 (já passou, mas devolver hoje não é atraso) e 23:59.
  perform pg_temp.loan(A2, b1, 0, '00:00');
  perform pg_temp.loan(A2, b2, 0, '23:59');
  -- A vencer (até 2 dias): amanhã 00:00 e daqui a 2 dias 23:59. Daqui a 3 dias já é "depois".
  perform pg_temp.loan(A3, b3, 1, '00:00');
  perform pg_temp.loan(A3, b4, 2, '23:59');
  perform pg_temp.loan(A4, b3, 3, '00:00');
  perform pg_temp.loan(A4, b4, 10, '12:00');
  -- Devolvido (atrasado, mas fechado): não conta como emprestado nem atrasado.
  l1 := pg_temp.loan(A4, b1, -5, '12:00', true);
  l2 := pg_temp.loan(A3, b1, -4, '12:00', true);
  l3 := pg_temp.loan(A2, b3, -2, '12:00', true);
  -- Multas: duas em aberto (300 + 150) e uma paga (500, fora da soma).
  insert into public.fines (loan_id, user_id, days_late, amount_cents, paid_at) values
    (l1, A4::uuid, 3, 300, null), (l2, A3::uuid, 4, 150, null), (l3, A2::uuid, 5, 500, now());
  -- Reservas pedagógicas: 2 pendentes, 1 aprovada.
  insert into public.pedagogical_reservations (teacher_id, start_date, days, status) values
    (P1::uuid, current_date + 1, 5, 'pending'), (P1::uuid, current_date + 2, 5, 'pending'), (P1::uuid, current_date + 3, 5, 'approved');

  perform pg_temp.as_user(LIB);
  select * into r from public.panel_summary();
  perform pg_temp.say('emprestados = 8 empréstimos em aberto (devolvidos não contam)', r.borrowed = 8);
  perform pg_temp.say('atrasados = 2 (prazo em dia anterior a hoje)', r.overdue = 2);
  perform pg_temp.say('vence hoje = 2 (00:00 e 23:59 de hoje; 00:00 não vira atraso)', r.due_today = 2);
  perform pg_temp.say('a vencer = 2 (amanhã e daqui a 2 dias; daqui a 3 dias fica de fora)', r.due_soon = 2);
  perform pg_temp.say('disponíveis = 40 - 8 = 32 (livro inativo não entra)', r.available_copies = 32);
  perform pg_temp.say('multas em aberto = 2 no total de R$ 4,50 (a paga fica de fora)', r.open_fines = 2 and r.open_fines_cents = 450);
  perform pg_temp.say('reservas pedagógicas pendentes = 2 (a aprovada fica de fora)', r.pending_pedagogical = 2);

  select * into r from public.panel_summary(3);
  perform pg_temp.say('janela de 3 dias inclui o prazo de daqui a 3 dias', r.due_soon = 3);
  select * into r from public.panel_summary(null);
  perform pg_temp.say('janela nula usa o padrão de 2 dias', r.due_soon = 2);
  select * into r from public.panel_summary(0);
  perform pg_temp.say('janela 0 vale no mínimo 1 dia (amanhã)', r.due_soon = 1);
  select * into r from public.panel_summary(9999);
  perform pg_temp.say('janela enorme é limitada a 30 dias', r.due_soon = 4);

  -- Acesso: só a bibliotecária.
  perform pg_temp.as_user(A1);
  perform pg_temp.say('aluno NÃO lê o painel (forbidden)', pg_temp.err('select * from public.panel_summary()') = 'forbidden');
  perform pg_temp.as_user(P1);
  perform pg_temp.say('professor NÃO lê o painel (forbidden)', pg_temp.err('select * from public.panel_summary()') = 'forbidden');
  perform pg_temp.as_anon();
  perform pg_temp.say('anônimo NÃO executa panel_summary', pg_temp.err('select * from public.panel_summary()') like 'permission denied%');
  perform set_config('role','postgres',true);
end $$;
