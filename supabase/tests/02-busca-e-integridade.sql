-- Testes da busca do acervo (card 0228) e da integridade de empréstimo, devolução, renovação e reserva (card 0229).
-- Rode depois de aplicar as migrations num Postgres de teste (veja docs/database/modelo-de-dados.md), em banco novo.
-- Cada linha mostra PASS ou FAIL. A concorrência de verdade (várias conexões ao mesmo tempo) está em 03-concorrencia.sh.

insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-0000000000b1','ana@x.com','{"full_name":"Ana Aluna"}'),
 ('00000000-0000-0000-0000-0000000000b2','bia@x.com','{"full_name":"Bia Aluna"}'),
 ('00000000-0000-0000-0000-0000000000b3','caio@x.com','{"full_name":"Caio Aluno"}'),
 ('00000000-0000-0000-0000-0000000000b4','dora@x.com','{"full_name":"Dora Bibliotecária"}'),
 ('00000000-0000-0000-0000-0000000000b5','edu@x.com','{"full_name":"Edu Formando"}');
update public.profiles set role = 'librarian', job_title = 'Auxiliar' where id = '00000000-0000-0000-0000-0000000000b4';
update public.profiles set graduating = true where id = '00000000-0000-0000-0000-0000000000b5';

create function pg_temp.as_user(u text) returns void language plpgsql as $$
begin perform set_config('role','authenticated',true); perform set_config('request.jwt.claim.sub',u,true); end $$;
create function pg_temp.say(n text, ok boolean) returns void language plpgsql as $$
begin raise notice '% %', case when ok then 'PASS ' else 'FAIL ' end, n; end $$;
-- Roda um comando e devolve a mensagem do erro (ou 'ok'); desfaz o que o comando fez se falhar.
create function pg_temp.err(cmd text) returns text language plpgsql as $$
begin execute cmd; return 'ok'; exception when others then return sqlerrm; end $$;

-- Texto do plano de execução de uma consulta (para provar que o índice é usado).
create function pg_temp.plan_of(q text) returns text language plpgsql as $$
declare l text; r text := '';
begin for l in execute 'explain ' || q loop r := r || l || E'\n'; end loop; return r; end $$;

-- Livros de teste: 1 (poucos exemplares), 2 e 3 (acervo para busca), mais 1500 para o índice ter o que indexar.
insert into public.books (id, title, author, category, code, isbn, quantity) values
 ('b0000000-0000-0000-0000-0000000000c1','Dom Casmurro','Machado de Assis','Romance','S-001',null,1),
 ('b0000000-0000-0000-0000-0000000000c2','São Paulo Antigo','Maria Souza','História','S-002','978-85-352-8761-5',2),
 ('b0000000-0000-0000-0000-0000000000c3','Sao Bernardo','Graciliano Ramos','Romance','S-003',null,1),
 ('b0000000-0000-0000-0000-0000000000c4','Cem por cento (100%) Seguro','Fulano','Técnico','S-004',null,1),
 ('b0000000-0000-0000-0000-0000000000c5','Livro de Cinco','Autor','Técnico','S-005',null,5);
insert into public.books (title, author, category, code, quantity)
  select 'Volume ' || g, 'Autor ' || (g % 50), 'Cat ' || (g % 10), 'V-' || g, 1 from generate_series(1, 1500) g;
update public.books set status = 'inactive' where code = 'V-1';
analyze public.books;

do $$
declare
  ANA text:='00000000-0000-0000-0000-0000000000b1'; BIA text:='00000000-0000-0000-0000-0000000000b2';
  CAIO text:='00000000-0000-0000-0000-0000000000b3'; DORA text:='00000000-0000-0000-0000-0000000000b4';
  EDU text:='00000000-0000-0000-0000-0000000000b5';
  c1 uuid:='b0000000-0000-0000-0000-0000000000c1'; c2 uuid:='b0000000-0000-0000-0000-0000000000c2';
  c3 uuid:='b0000000-0000-0000-0000-0000000000c3'; c4 uuid:='b0000000-0000-0000-0000-0000000000c4';
  c5 uuid:='b0000000-0000-0000-0000-0000000000c5';
  v2 uuid; v3 uuid; v5 uuid; v6 uuid; v7 uuid; v8 uuid; v_due0 timestamptz;
  n int; t bigint; r record; msg text; plan text; v_loan public.loans; v_res public.reservations; v_key uuid;
begin
  select id into v2 from public.books where code = 'V-2'; select id into v3 from public.books where code = 'V-3';
  select id into v5 from public.books where code = 'V-5'; select id into v6 from public.books where code = 'V-6'; select id into v7 from public.books where code = 'V-7'; select id into v8 from public.books where code = 'V-8';
  ---------------------------------------------------------------- BUSCA (0228)
  perform pg_temp.as_user(ANA);
  select count(*), max(total_count) into n, t from public.search_books('sao');
  perform pg_temp.say('busca "sao" acha São Paulo e Sao Bernardo (sem acento)', n = 2 and t = 2);
  select count(*) into n from public.search_books('SÃO paulo');
  perform pg_temp.say('busca com acento e maiúscula acha o mesmo livro', n = 1);
  select count(*) into n from public.search_books('9788535287615');
  perform pg_temp.say('busca por ISBN sem hífens acha o livro guardado com hífens (0247)', n = 1);
  select count(*) into n from public.search_books('978-85-352-8761-5');
  perform pg_temp.say('busca por ISBN com hífens', n = 1);
  select count(*) into n from public.search_books('978-85-352');
  perform pg_temp.say('busca por pedaço do ISBN com hífens', n = 1);
  select count(*) into n from public.search_books('85352876');
  perform pg_temp.say('busca por pedaço do ISBN sem hífens', n = 1);
  select isbn into msg from public.search_books('9788535287615');
  perform pg_temp.say('a busca devolve o ISBN do livro como foi guardado', msg = '978-85-352-8761-5');
  perform pg_temp.say('livro sem empréstimo nem reserva não tem histórico', not (select has_history from public.search_books('s-003')));
  select count(*) into n from public.search_books('s-003');
  perform pg_temp.say('busca por código', n = 1);
  select count(*) into n from public.search_books('100%');
  perform pg_temp.say('"%" na busca vale como texto, não como curinga', n = 1);
  select count(*) into n from public.search_books('_');
  perform pg_temp.say('"_" na busca vale como texto, não como curinga', n = 0);
  select title into msg from public.search_books('sao', null, 'all', 'active', 'relevance') limit 1;
  perform pg_temp.say('relevância: título que começa com o termo vem primeiro', msg = 'Sao Bernardo' or msg = 'São Paulo Antigo');
  select count(*) into n from public.search_books(p_page_size => 500);
  perform pg_temp.say('página nunca passa de 50 linhas', n = 50);
  select max(page_number), max(total_count) into n, t from public.search_books(p_page => 999, p_page_size => 50);
  perform pg_temp.say('página além do fim devolve a última (31 de 31)', n = 31);
  perform pg_temp.say('livro inativo não aparece para o aluno (1504 ativos)', t = 1504);
  select * into r from public.book_situation_counts();
  perform pg_temp.say('contadores batem com a busca por situação',
    r.available = (select max(total_count) from public.search_books(null, null, 'available'))
    and r.available + r.reserved + r.unavailable = r.total and r.total = 1504);
  perform pg_temp.say('aluno NÃO lista livros inativos', pg_temp.err('select * from public.search_books(null, null, ''all'', ''all'')') = 'forbidden');
  perform pg_temp.say('situação inválida é recusada', pg_temp.err('select * from public.search_books(null, null, ''x'')') = 'invalid_situation');
  perform pg_temp.say('categorias: uma consulta, sem repetir', (select count(*) from public.book_categories()) = (select count(distinct category) from public.books where status = 'active' and category is not null));
  perform pg_temp.say('mais de 100 ids na disponibilidade é recusado',
    pg_temp.err('select * from public.book_availability_for_books(array(select gen_random_uuid() from generate_series(1,101)))') = 'too_many_books');

  perform pg_temp.as_user(DORA);
  select count(*) into n from public.search_books('volume 1', null, 'all', 'inactive');
  perform pg_temp.say('bibliotecária lista livros inativos', n = 1);
  select * into r from public.book_situation_counts(null, null, 'all');
  perform pg_temp.say('contadores: total e inativos', r.total = 1505 and r.inactive = 1);

  -- o índice trigrama é usado (sem forçar não prova nada com tabela pequena; aqui desligamos a varredura sequencial)
  perform set_config('role', 'postgres', true);
  perform set_config('enable_seqscan', 'off', true);
  plan := pg_temp.plan_of('select id from public.books where public.search_fold(title) like ''%volume 7%''');
  perform pg_temp.say('busca por título usa o índice trigrama', plan like '%idx_books_title_trgm%');
  perform set_config('enable_seqscan', 'on', true);

  ---------------------------------------------------------------- EMPRÉSTIMO (0229)
  perform pg_temp.as_user(ANA);
  perform pg_temp.say('aluno NÃO registra empréstimo pela função', pg_temp.err(format('select public.create_loan(%L, %L)', c5, ANA)) like 'forbidden');

  perform pg_temp.as_user(DORA);
  perform public.create_loan(c5, ANA::uuid);
  perform public.create_loan(c2, ANA::uuid);
  perform public.create_loan(c3, ANA::uuid);
  select * into v_loan from public.loans where user_id = ANA::uuid and book_id = c5;
  perform pg_temp.say('prazo padrão de 7 dias', abs(extract(epoch from (v_loan.due_at - v_loan.borrowed_at)) - 7*86400) < 2);
  perform pg_temp.say('4º livro do aluno é recusado (limite 3)', pg_temp.err(format('select public.create_loan(%L, %L)', c4, ANA)) = 'loan_limit_reached');
  perform pg_temp.say('mesmo gravando direto na tabela o limite vale (gatilho)',
    pg_temp.err(format('insert into public.loans(book_id,user_id,due_at) values (%L, %L, now()+interval ''7 days'')', c4, ANA)) = 'loan_limit_reached');
  perform pg_temp.say('mesmo livro duas vezes para a mesma pessoa é recusado', pg_temp.err(format('select public.create_loan(%L, %L)', c5, ANA)) = 'already_borrowed');
  perform pg_temp.say('índice único recusa o 2º empréstimo aberto direto na tabela',
    pg_temp.err(format('insert into public.loans(book_id,user_id,due_at) values (%L, %L, now()+interval ''7 days'')', c5, ANA)) in ('loan_limit_reached','duplicate key value violates unique constraint "loans_one_open_per_user_book"'));

  perform public.create_loan(c5, EDU::uuid); perform public.create_loan(c2, EDU::uuid);
  perform public.create_loan(c4, EDU::uuid);
  perform pg_temp.say('formando pega 3...', (select count(*) from public.loans where user_id = EDU::uuid) = 3);
  perform public.create_loan(v2, EDU::uuid);
  perform pg_temp.say('...e o 4º livro (formando)', (select count(*) from public.loans where user_id = EDU::uuid and returned_at is null) = 4);
  perform pg_temp.say('5º livro do formando é recusado', pg_temp.err(format('select public.create_loan(%L, %L)', v3, EDU)) = 'loan_limit_reached');

  -- exemplares: c1 tem 1 só. A Bia pega; Caio não.
  perform pg_temp.say('o último exemplar vai para a primeira pessoa', pg_temp.err(format('select public.create_loan(%L, %L)', c1, BIA)) = 'ok');
  perform pg_temp.say('o mesmo exemplar de novo (outra pessoa) é recusado', pg_temp.err(format('select public.create_loan(%L, %L)', c1, CAIO)) = 'no_copy_available');
  perform pg_temp.say('direto na tabela também: sem exemplar livre',
    pg_temp.err(format('insert into public.loans(book_id,user_id,due_at) values (%L, %L, now()+interval ''7 days'')', c1, CAIO)) = 'no_copy_available');
  perform pg_temp.say('baixar a quantidade abaixo dos empréstimos em aberto é recusado',
    pg_temp.err(format('update public.books set quantity = 1 where id = %L', c5)) = 'quantity_below_open_loans');

  -- idempotência
  v_key := gen_random_uuid();
  select * into v_loan from public.create_loan(c5, CAIO::uuid, v_key);
  perform pg_temp.say('chave nova cria o empréstimo', v_loan.id is not null);
  perform pg_temp.say('mesma chave devolve o mesmo empréstimo, sem duplicar',
    (select id from public.create_loan(c5, CAIO::uuid, v_key)) = v_loan.id
    and (select count(*) from public.loans where user_id = CAIO::uuid and book_id = c5) = 1);
  perform pg_temp.say('chave reusada em outra ação é recusada', pg_temp.err(format('select public.return_loan(%L, %L)', v_loan.id, v_key)) = 'idempotency_key_reused');
  perform pg_temp.say('tabela de chaves não é lida pelo app', pg_temp.err('select count(*) from public.action_keys') like 'permission denied%');

  ---------------------------------------------------------------- DEVOLUÇÃO E MULTA
  select * into v_loan from public.return_loan(v_loan.id);
  perform pg_temp.say('devolução no prazo: sem multa', v_loan.returned_at is not null and not exists (select 1 from public.fines where loan_id = v_loan.id));
  perform pg_temp.say('devolver de novo não faz nada', (select returned_at from public.return_loan(v_loan.id)) = v_loan.returned_at
    and (select count(*) from public.audit_logs where action = 'loan_returned' and entity_id = v_loan.id) = 1);
  perform pg_temp.say('empréstimo devolvido não reabre', pg_temp.err(format('update public.loans set returned_at = null where id = %L', v_loan.id)) = 'loan_already_returned');
  perform pg_temp.say('empréstimo não troca de livro nem de pessoa', pg_temp.err(format('update public.loans set user_id = %L where id = %L', BIA, v_loan.id)) = 'loan_immutable');

  -- atraso de 3 dias (empréstimo antigo gravado como histórico pelo banco; depois reaberto pela via direta de teste)
  perform set_config('role', 'postgres', true);
  insert into public.loans (id, book_id, user_id, borrowed_at, due_at, created_by)
    values ('a0000000-0000-0000-0000-000000000001', v5, CAIO::uuid, now() - interval '10 days', now() - interval '3 days', DORA::uuid);
  perform pg_temp.as_user(DORA);
  perform public.return_loan('a0000000-0000-0000-0000-000000000001');
  select * into r from public.fines where loan_id = 'a0000000-0000-0000-0000-000000000001';
  perform pg_temp.say('multa de 3 dias de atraso = R$ 3,00', r.days_late = 3 and r.amount_cents = 300);
  perform public.return_loan('a0000000-0000-0000-0000-000000000001');
  perform pg_temp.say('devolver de novo não duplica a multa', (select count(*) from public.fines where loan_id = 'a0000000-0000-0000-0000-000000000001') = 1);
  perform pg_temp.say('multa em aberto bloqueia novo empréstimo (RF-15)', pg_temp.err(format('select public.create_loan(%L, %L)', c1, CAIO)) = 'user_has_pending');

  -- multa criada antes pela tarefa diária (3 dias) e devolução com 4 dias de atraso: vale o valor final
  perform set_config('role', 'postgres', true);
  insert into public.loans (id, book_id, user_id, borrowed_at, due_at, created_by)
    values ('a0000000-0000-0000-0000-000000000002', v7, CAIO::uuid, now() - interval '12 days', now() - interval '4 days', DORA::uuid);
  insert into public.fines (loan_id, user_id, days_late, amount_cents)
    values ('a0000000-0000-0000-0000-000000000002', CAIO::uuid, 3, 300);
  perform pg_temp.as_user(DORA);
  perform public.return_loan('a0000000-0000-0000-0000-000000000002');
  select * into r from public.fines where loan_id = 'a0000000-0000-0000-0000-000000000002';
  perform pg_temp.say('multa criada pela tarefa com 3 dias vira R$ 4,00 na devolução com 4', r.days_late = 4 and r.amount_cents = 400);
  perform pg_temp.say('multa atualizada não gera outro "fine_created"', (select count(*) from public.audit_logs where action = 'fine_created' and entity_id = r.id) = 0);
  -- multa já paga não muda
  perform set_config('role', 'postgres', true);
  insert into public.loans (id, book_id, user_id, borrowed_at, due_at, created_by)
    values ('a0000000-0000-0000-0000-000000000003', v8, BIA::uuid, now() - interval '12 days', now() - interval '4 days', DORA::uuid);
  insert into public.fines (loan_id, user_id, days_late, amount_cents, paid_at)
    values ('a0000000-0000-0000-0000-000000000003', BIA::uuid, 3, 300, now());
  perform pg_temp.as_user(DORA);
  perform public.return_loan('a0000000-0000-0000-0000-000000000003');
  select * into r from public.fines where loan_id = 'a0000000-0000-0000-0000-000000000003';
  perform pg_temp.say('multa já paga não muda na devolução', r.days_late = 3 and r.amount_cents = 300 and r.paid_at is not null);

  ---------------------------------------------------------------- RESERVA
  -- c1 tem 1 exemplar e está com a Bia. Ana reserva; Caio (com multa) reserva também.
  perform pg_temp.as_user(BIA);
  perform pg_temp.say('reserva de livro com exemplar livre é recusada', pg_temp.err(format('select public.reserve_book(%L)', v3)) = 'book_available');
  perform pg_temp.as_user(ANA);
  perform pg_temp.say('no limite de 3 livros a pessoa NÃO entra na fila', pg_temp.err(format('select public.reserve_book(%L)', c1)) = 'loan_limit_reached');
  perform pg_temp.as_user(DORA);
  perform public.return_loan((select id from public.loans where user_id = ANA::uuid and book_id = c5 and returned_at is null));
  perform pg_temp.as_user(ANA);
  select * into v_res from public.reserve_book(c1);
  perform pg_temp.say('aluno reserva livro sem exemplar livre', v_res.status = 'waiting' and v_res.user_id = ANA::uuid);
  perform pg_temp.say('reserva repetida é recusada', pg_temp.err(format('select public.reserve_book(%L)', c1)) = 'already_reserved');
  perform pg_temp.say('aluno NÃO reserva em nome de outro', pg_temp.err(format('select public.reserve_book(%L, %L)', c1, BIA)) = 'forbidden');
  perform pg_temp.as_user(BIA);
  perform pg_temp.say('quem está com o livro não o reserva', pg_temp.err(format('select public.reserve_book(%L)', c1)) = 'already_borrowed');

  perform pg_temp.as_user(DORA);
  perform public.return_loan((select id from public.loans where user_id = BIA::uuid and book_id = c1 and returned_at is null));
  perform pg_temp.say('devolução promove a reserva para "pronta"', (select status from public.reservations where id = v_res.id) = 'ready');
  perform pg_temp.say('exemplar guardado não vai para outra pessoa', pg_temp.err(format('select public.create_loan(%L, %L)', c1, BIA)) = 'copy_reserved_for_others');
  perform pg_temp.say('nem direto na tabela',
    pg_temp.err(format('insert into public.loans(book_id,user_id,due_at) values (%L, %L, now()+interval ''7 days'')', c1, BIA)) = 'copy_reserved_for_others');
  perform public.create_loan(c5, ANA::uuid);  -- depois de reservar, Ana pega outro livro e volta ao limite de 3
  perform pg_temp.say('a dona da reserva também respeita o limite (Ana já tem 3)', pg_temp.err(format('select public.create_loan(%L, %L)', c1, ANA)) = 'loan_limit_reached');
  perform public.return_loan((select id from public.loans where user_id = ANA::uuid and book_id = c5 and returned_at is null));
  perform public.create_loan(c1, ANA::uuid);
  perform pg_temp.say('...depois de devolver um, ela pega e a reserva vira "fulfilled"', (select status from public.reservations where id = v_res.id) = 'fulfilled');

  -- cancelamento promove o próximo da fila
  perform pg_temp.as_user(BIA);
  select * into v_res from public.reserve_book(c1);
  perform pg_temp.as_user(CAIO);
  perform pg_temp.say('só a dona (ou a bibliotecária) cancela a reserva', pg_temp.err(format('select public.cancel_reservation(%L)', v_res.id)) = 'forbidden');
  perform pg_temp.as_user(BIA);
  perform public.cancel_reservation(v_res.id);
  perform pg_temp.say('cancelar libera a reserva', (select status from public.reservations where id = v_res.id) = 'cancelled');
  perform pg_temp.say('cancelar de novo não faz nada', (select status from public.cancel_reservation(v_res.id)) = 'cancelled');

  -- renovação
  perform pg_temp.as_user(ANA);
  select * into v_loan from public.loans where user_id = ANA::uuid and book_id = c1 and returned_at is null;
  v_due0 := v_loan.due_at;
  select * into v_loan from public.renew_loan(v_loan.id);
  perform pg_temp.say('aluno renova o próprio empréstimo (+1 renovação)', v_loan.renewals = 1);
  perform pg_temp.say('renovar no mesmo dia soma 7 dias ao prazo', v_loan.due_at = v_due0 + interval '7 days');
  -- limite de renovações: a 1ª já foi feita acima; 2ª e 3ª passam, a 4ª é recusada
  perform public.renew_loan(v_loan.id); select * into v_loan from public.renew_loan(v_loan.id);
  perform pg_temp.say('3 renovações passam', v_loan.renewals = 3);
  perform pg_temp.say('3 renovações somam 21 dias ao prazo original', v_loan.due_at = v_due0 + interval '21 days');
  perform pg_temp.say('a 4ª renovação é recusada', pg_temp.err(format('select public.renew_loan(%L)', v_loan.id)) = 'renewal_limit_reached');
  perform pg_temp.say('limite não é executável pelo app', not has_function_privilege('authenticated', 'public.max_renewals()', 'execute'));
  perform pg_temp.as_user(BIA);
  perform pg_temp.say('aluno NÃO renova empréstimo de outro', pg_temp.err(format('select public.renew_loan(%L)', v_loan.id)) = 'forbidden');
  select * into v_res from public.reserve_book(c1);
  perform pg_temp.as_user(ANA);
  perform pg_temp.say('livro reservado por outra pessoa não renova', pg_temp.err(format('select public.renew_loan(%L)', v_loan.id)) = 'book_has_reservations');
  perform pg_temp.say('livro devolvido não renova', pg_temp.err(format('select public.renew_loan(%L)', (select id from public.loans where user_id = ANA::uuid and book_id = c5 limit 1))) = 'loan_already_returned');

  -- pendência por atraso
  perform set_config('role', 'postgres', true);
  insert into public.loans (book_id, user_id, borrowed_at, due_at, created_by)
    values (v6, BIA::uuid, now() - interval '9 days', now() - interval '2 days', DORA::uuid);
  perform pg_temp.as_user(DORA);
  perform pg_temp.say('empréstimo vencido bloqueia novo empréstimo', pg_temp.err(format('select public.create_loan(%L, %L)', c5, BIA)) = 'user_has_pending');
  perform pg_temp.as_user(BIA);
  perform pg_temp.say('empréstimo vencido não renova', pg_temp.err(format('select public.renew_loan(%L)', (select id from public.loans where user_id = BIA::uuid and book_id = v6 and returned_at is null))) = 'loan_overdue');

  ---------------------------------------------------------------- BUSCA COM EMPRÉSTIMOS (situação, ordem, histórico, texto longo)
  perform pg_temp.as_user(ANA);
  perform pg_temp.say('texto de busca muito longo não dá erro nem acha nada', (select count(*) from public.search_books(repeat('a', 500))) = 0);
  perform pg_temp.say('texto só de curingas ("%_%") não vira "todos os livros"', (select count(*) from public.search_books('%_%')) = 0);
  perform pg_temp.say('filtro "emprestado" devolve só emprestados (e há ao menos um)',
    (select count(*) from public.search_books(null, null, 'unavailable')) > 0
    and not exists (select 1 from public.search_books(null, null, 'unavailable') where situation <> 'unavailable'));
  perform pg_temp.say('filtro "reservado" devolve só reservados',
    not exists (select 1 from public.search_books(null, null, 'reserved') where situation <> 'reserved'));
  perform pg_temp.say('filtro "disponível" não traz emprestado',
    not exists (select 1 from public.search_books(null, null, 'available', 'active', 'title', 1, 50) where situation <> 'available'));
  perform pg_temp.say('ordem por título', (select array_agg(title order by ord) from (select title, row_number() over () ord from public.search_books(null, null, 'all', 'active', 'title', 1, 20)) x)
    = (select array_agg(title order by title, id) from (select title, id from public.books where status = 'active' order by title, id limit 20) y));
  perform pg_temp.say('ordem por autor', (select array_agg(author order by ord) from (select author, row_number() over () ord from public.search_books(null, null, 'all', 'active', 'author', 1, 20)) x)
    = (select array_agg(author order by author, title, id) from (select author, title, id from public.books where status = 'active' order by author, title, id limit 20) y));
  perform pg_temp.say('ordem "disponíveis primeiro": nenhum emprestado antes de um disponível',
    (select bool_and(rk >= prev) from (select rk, coalesce(lag(rk) over (order by ord), 0) prev
      from (select row_number() over () ord, case situation when 'available' then 0 when 'reserved' then 1 else 2 end rk
            from public.search_books(null, null, 'all', 'active', 'available', 1, 50)) a) b));
  ---------------------------------------------------------------- PAGINAÇÃO NO BANCO (0260): LIMIT/OFFSET sem numerar o acervo
  -- Percorrer todas as páginas dá a lista inteira, na mesma ordem, sem repetir nem pular livro, em cada ordem possível.
  perform pg_temp.say('páginas de 7 por título cobrem o acervo ativo, em ordem, sem repetir nem faltar',
    (select array_agg(id order by pg, ord) from (
       select p, pg, ord, id from generate_series(1, 230) p,
       lateral (select p as pg, row_number() over () ord, s.id from public.search_books(null, null, 'all', 'active', 'title', p, 7) s) x) z
     where pg <= ceil((select count(*) from public.books where status = 'active') / 7.0))
    = (select array_agg(id order by title, id) from public.books where status = 'active'));
  perform pg_temp.say('páginas por autor cobrem o acervo ativo, em ordem',
    (select array_agg(id order by pg, ord) from (
       select pg, ord, id from generate_series(1, 230) p,
       lateral (select p as pg, row_number() over () ord, s.id from public.search_books(null, null, 'all', 'active', 'author', p, 7) s) x) z
     where pg <= ceil((select count(*) from public.books where status = 'active') / 7.0))
    = (select array_agg(id order by author, title, id) from public.books where status = 'active'));
  perform pg_temp.say('páginas de "disponíveis primeiro" não repetem nem pulam livro',
    (select count(*) = count(distinct id) and count(*) = (select count(*) from public.books where status = 'active') from (
       select s.id, p from generate_series(1, 230) p,
       lateral (select * from public.search_books(null, null, 'all', 'active', 'available', p, 7)) s
       where p <= ceil((select count(*) from public.books where status = 'active') / 7.0)) z));
  perform pg_temp.say('páginas da busca por texto (relevância) cobrem o resultado sem repetir',
    (select count(*) = count(distinct id) and count(*) = (select count(*) from public.books where status = 'active' and public.search_fold(title) like '%volume 1%') from (
       select s.id from generate_series(1, 30) p,
       lateral (select * from public.search_books('volume 1', null, 'all', 'active', 'relevance', p, 50)) s
       where p <= ceil((select max(total_count) from public.search_books('volume 1', null, 'all', 'active', 'relevance', 1, 50)) / 50.0)) z));
  perform pg_temp.say('página do meio traz o total e o número da página pedida',
    (select count(*) = 7 and max(total_count) = (select count(*) from public.books where status = 'active') and max(page_number) = 40
     from public.search_books(null, null, 'all', 'active', 'title', 40, 7)));
  perform pg_temp.say('total e página com filtro de situação (livro emprestado) batem com a lista',
    (select max(total_count) from public.search_books(null, null, 'unavailable', 'active', 'title', 1, 1))
    = (select count(*) from public.search_books(null, null, 'unavailable', 'active', 'title', 1, 50)));
  -- A função roda com plano novo a cada chamada (plan_cache_mode): depois de 5 chamadas o plpgsql trocaria para o plano
  -- genérico e a ordem/os filtros dependentes dos parâmetros deixariam de valer. Chamar 12 vezes seguidas com ordens
  -- diferentes tem de repetir o mesmo resultado da primeira vez.
  perform pg_temp.say('12 chamadas seguidas (alternando a ordem) repetem o mesmo resultado da primeira',
    (select bool_and(distintas = 1) from (
       select srt, count(distinct lista) distintas from (
         select srt, (select string_agg(x.id::text, ',' order by x.ord) from (select s.id, row_number() over () ord
            from public.search_books(null, null, 'all', 'active', srt, 1, 12) s) x) lista
         from (values ('title'), ('author'), ('available'), ('relevance')) o(srt), generate_series(1, 12)) q
       group by srt) g));
  perform pg_temp.say('search_books: security definer, search_path vazio e plano por chamada',
    (select p.prosecdef and p.proconfig @> array['search_path=""', 'plan_cache_mode=force_custom_plan']
     from pg_proc p where p.oid = 'public.search_books(text,text,text,text,text,integer,integer)'::regprocedure));
  perform pg_temp.say('índices de ordem e de novidades da busca existem',
    (select count(*) = 4 from pg_indexes where schemaname = 'public' and tablename = 'books'
       and indexname in ('idx_books_status_title_id', 'idx_books_title_id', 'idx_books_status_author_title_id', 'idx_books_new_arrivals')));
  -- A página por título lê só o começo do índice (sem ordenar o acervo): com varredura em sequência proibida o plano usa o
  -- índice e não tem nó "Sort" (que apareceria se a consulta precisasse ordenar todas as linhas).
  perform set_config('role', 'postgres', true);
  perform set_config('enable_seqscan', 'off', true);
  plan := pg_temp.plan_of('select c.id from public.catalog_rows(null, null, ''active'') c order by c.title, c.id limit 12');
  perform pg_temp.say('página por título usa o índice e não ordena o acervo (plano sem Sort)',
    plan like '%idx_books_status_title_id%' and plan not like '%Sort%');
  perform set_config('enable_seqscan', 'on', true);

  perform pg_temp.as_user(DORA);
  perform pg_temp.say('livro com empréstimo tem histórico (só inativa, não exclui)', (select has_history from public.search_books('s-001', null, 'all', 'all')) );

  perform pg_temp.say('funções não são públicas (anon)', not has_function_privilege('anon', 'public.create_loan(uuid, uuid, uuid)', 'execute')
    and not has_function_privilege('anon', 'public.search_books(text,text,text,text,text,integer,integer)', 'execute'));
  perform pg_temp.say('funções internas não são executáveis pelo app', not has_function_privilege('authenticated', 'public.promote_reservations(uuid)', 'execute')
    and not has_function_privilege('authenticated', 'public.claim_action_key(uuid, uuid, text)', 'execute'));
end $$;
