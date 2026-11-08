-- Testes da baixa manual da multa (cards 0061 e 0093) e do cálculo da multa por atraso (card 0059).
-- Rode num Postgres de teste, em banco novo, depois de aplicar TODAS as migrations (inclui 20261108100200 e 20261108150000):
-- veja docs/database/modelo-de-dados.md. Cada linha mostra PASS ou FAIL.

insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-0000000000d1','ana@x.com','{"full_name":"Ana Aluna"}'),
 ('00000000-0000-0000-0000-0000000000d2','bia@x.com','{"full_name":"Bia Aluna"}'),
 ('00000000-0000-0000-0000-0000000000d3','dora@x.com','{"full_name":"Dora Bibliotecária"}'),
 ('00000000-0000-0000-0000-0000000000d4','eva@x.com','{"full_name":"Eva Bibliotecária"}');
update public.profiles set role = 'librarian', job_title = 'Auxiliar' where id in
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000d4');

create function pg_temp.as_user(u text) returns void language plpgsql as $$
begin perform set_config('role','authenticated',true); perform set_config('request.jwt.claim.sub',u,true); end $$;
create function pg_temp.as_anon() returns void language plpgsql as $$
begin perform set_config('role','anon',true); perform set_config('request.jwt.claim.sub','',true); end $$;
create function pg_temp.say(n text, ok boolean) returns void language plpgsql as $$
begin raise notice '% %', case when ok then 'PASS ' else 'FAIL ' end, n; end $$;
-- Roda um comando e devolve a mensagem do erro (ou 'ok').
create function pg_temp.err(cmd text) returns text language plpgsql as $$
begin execute cmd; return 'ok'; exception when others then return sqlerrm; end $$;

insert into public.books (id, title, author, code, quantity) values
 ('b0000000-0000-0000-0000-0000000000e1','Livro 1','Autor','F-001',10),
 ('b0000000-0000-0000-0000-0000000000e2','Livro 2','Autor','F-002',10),
 ('b0000000-0000-0000-0000-0000000000e3','Livro 3','Autor','F-003',10),
 ('b0000000-0000-0000-0000-0000000000e4','Livro 4','Autor','F-004',10),
 ('b0000000-0000-0000-0000-0000000000e5','Livro 5','Autor','F-005',10),
 ('b0000000-0000-0000-0000-0000000000e6','Livro 6','Autor','F-006',10);

-- Empréstimo em aberto cujo prazo venceu às 23:59 (Brasília) de N dias atrás (N = 0 é hoje, às 00:00).
create function pg_temp.open_loan(p_user text, p_book uuid, p_days_ago int) returns uuid language plpgsql as $$
declare v_id uuid; v_due timestamptz;
begin
  v_due := (((now() at time zone 'America/Sao_Paulo')::date - p_days_ago) + case when p_days_ago = 0 then time '00:00' else time '23:59' end)
           at time zone 'America/Sao_Paulo';
  insert into public.loans (book_id, user_id, borrowed_at, due_at)
  values (p_book, p_user::uuid, v_due - interval '7 days', v_due) returning id into v_id;
  return v_id;
end $$;

do $$
declare
  ANA text:='00000000-0000-0000-0000-0000000000d1'; BIA text:='00000000-0000-0000-0000-0000000000d2';
  DORA text:='00000000-0000-0000-0000-0000000000d3'; EVA text:='00000000-0000-0000-0000-0000000000d4';
  e1 uuid:='b0000000-0000-0000-0000-0000000000e1'; e2 uuid:='b0000000-0000-0000-0000-0000000000e2';
  e3 uuid:='b0000000-0000-0000-0000-0000000000e3'; e4 uuid:='b0000000-0000-0000-0000-0000000000e4';
  e5 uuid:='b0000000-0000-0000-0000-0000000000e5'; e6 uuid:='b0000000-0000-0000-0000-0000000000e6';
  l0 uuid; l1 uuid; l5 uuid; l8 uuid; f public.fines; f2 public.fines; k uuid := gen_random_uuid(); n int; v_paid_at timestamptz;
  v_loan public.loans;
begin
  ---------------------------------------------------------------- CÁLCULO DA MULTA (0059), pela devolução
  perform pg_temp.as_user(DORA);
  l0 := pg_temp.open_loan(ANA, e1, 0);   -- prazo hoje 00:00: devolver hoje não é atraso
  l1 := pg_temp.open_loan(ANA, e2, 1);   -- prazo ontem 23:59: devolver hoje já é 1 dia
  l5 := pg_temp.open_loan(BIA, e3, 5);
  l8 := pg_temp.open_loan(BIA, e4, 8);
  perform set_config('role','postgres',true); perform pg_temp.as_user(DORA);
  perform public.return_loan(l0);
  perform pg_temp.say('devolver no dia do prazo (mesmo horas depois) não gera multa', not exists (select 1 from public.fines where loan_id = l0));
  perform public.return_loan(l1);
  select * into f from public.fines where loan_id = l1;
  perform pg_temp.say('1 dia de atraso = R$ 1,00 (mesmo com poucas horas corridas)', f.days_late = 1 and f.amount_cents = 100);
  perform public.return_loan(l5);
  select * into f from public.fines where loan_id = l5;
  perform pg_temp.say('5 dias de atraso = R$ 5,00', f.days_late = 5 and f.amount_cents = 500);
  perform public.return_loan(l8);
  select * into f from public.fines where loan_id = l8;
  perform pg_temp.say('8 dias de atraso = R$ 8,00', f.days_late = 8 and f.amount_cents = 800);
  perform pg_temp.say('valor = dias x fine_cents_per_day (nenhum desconto por feriado ou recesso)',
    not exists (select 1 from public.fines where amount_cents <> days_late * 100));

  ---------------------------------------------------------------- BAIXA (0061)
  select * into f from public.fines where loan_id = l5;
  perform pg_temp.as_anon();
  perform pg_temp.say('anônimo NÃO executa pay_fine', pg_temp.err(format('select public.pay_fine(%L)', f.id)) like 'permission denied%');
  perform pg_temp.as_user(ANA);
  perform pg_temp.say('aluno NÃO dá baixa (forbidden)', pg_temp.err(format('select public.pay_fine(%L)', f.id)) = 'forbidden');
  perform set_config('role','postgres',true);
  perform pg_temp.say('multa de outra pessoa segue em aberto após tentativa do aluno', (select paid_at from public.fines where id = f.id) is null);

  perform pg_temp.as_user(DORA);
  perform pg_temp.say('multa inexistente é recusada', pg_temp.err('select public.pay_fine(gen_random_uuid())') = 'fine_not_found');
  perform pg_temp.say('create_loan bloqueia com multa em aberto',
    pg_temp.err(format('select public.create_loan(%L, %L)', e5, BIA)) = 'user_has_pending');

  f := public.pay_fine(f.id, k);
  perform pg_temp.say('baixa grava a data', f.paid_at is not null);
  perform pg_temp.say('baixa grava quem registrou', f.paid_by = DORA::uuid);
  perform set_config('role','postgres',true);
  perform pg_temp.say('auditoria fine_paid gravada só com ids',
    (select count(*) from public.audit_logs where action = 'fine_paid' and entity_id = f.id
       and actor_id = DORA::uuid and details = jsonb_build_object('fine_id', f.id, 'loan_id', f.loan_id, 'user_id', f.user_id)) = 1);

  perform pg_temp.as_user(DORA);
  f2 := public.pay_fine(f.id, k);
  perform pg_temp.say('mesma chave de idempotência: devolve a mesma baixa', f2.paid_at = f.paid_at and f2.paid_by = f.paid_by);
  perform pg_temp.as_user(EVA);
  f2 := public.pay_fine(f.id);
  perform pg_temp.say('multa já paga, outra bibliotecária, sem chave: nada muda (autor e data da 1ª baixa)',
    f2.paid_at = f.paid_at and f2.paid_by = DORA::uuid);
  perform set_config('role','postgres',true);
  perform pg_temp.say('baixa repetida não duplica a auditoria',
    (select count(*) from public.audit_logs where action = 'fine_paid' and entity_id = f.id) = 1);

  perform pg_temp.as_user(DORA);
  perform pg_temp.say('mesma chave em outra ação é recusada',
    pg_temp.err(format('select public.return_loan(%L, %L)', l1, k)) = 'idempotency_key_reused');

  -- a pessoa ainda deve a multa de 8 dias: segue bloqueada; pagando as duas, libera
  perform pg_temp.say('com outra multa em aberto o usuário segue bloqueado',
    pg_temp.err(format('select public.create_loan(%L, %L)', e5, BIA)) = 'user_has_pending');
  perform public.pay_fine((select id from public.fines where loan_id = l8));
  perform pg_temp.say('depois da baixa de todas as multas, create_loan libera o empréstimo',
    pg_temp.err(format('select public.create_loan(%L, %L)', e5, BIA)) = 'ok');

  -- multa paga não é reaberta nem alterada pelo cálculo (devolução repetida e tarefa diária)
  select paid_at into v_paid_at from public.fines where loan_id = l5;
  perform public.return_loan(l5);
  perform pg_temp.say('devolver de novo não mexe na multa paga', (select paid_at from public.fines where loan_id = l5) = v_paid_at);

  ---------------------------------------------------------------- ACESSO
  perform pg_temp.as_user(BIA);
  select count(*) into n from public.fines;
  perform pg_temp.say('aluno vê só as próprias multas (2)', n = 2);
  perform pg_temp.as_user(ANA);
  select count(*) into n from public.fines;
  perform pg_temp.say('outro aluno vê só a dele (1)', n = 1);
  perform pg_temp.err(format('update public.fines set paid_at = now() where user_id = %L', ANA));
  perform pg_temp.say('aluno NÃO dá baixa gravando direto na tabela de multas', (select paid_at from public.fines where user_id = ANA::uuid) is null);
  perform pg_temp.as_user(DORA);
  select count(*) into n from public.fines;
  perform pg_temp.say('bibliotecária vê todas as multas (3)', n = 3);
end $$;
