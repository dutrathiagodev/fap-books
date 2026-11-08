-- Histórico de empréstimos (cards 0068 e 0069): só a bibliotecária lê o histórico de todos; o aluno e o professor só o próprio.
-- Rode depois das migrations e do 01-regras-de-acesso.sql (que cria os usuários de teste). Cada linha mostra PASS ou FAIL.
-- NÃO rode no projeto real do Supabase.
create function pg_temp.as_user(u text) returns void language plpgsql as $f$
begin perform set_config('role','authenticated',true); perform set_config('request.jwt.claim.sub',u,true); end $f$;
create function pg_temp.say(n text, ok boolean) returns void language plpgsql as $f$
begin raise notice '% %', case when ok then 'PASS ' else 'FAIL ' end, n; end $f$;

do $$
declare A1 text:='00000000-0000-0000-0000-000000000001'; A2 text:='00000000-0000-0000-0000-000000000002';
        T1 text:='00000000-0000-0000-0000-000000000003'; L1 text:='00000000-0000-0000-0000-000000000004';
        BK uuid:='b0000000-0000-0000-0000-000000000001'; c int; loan1 uuid; loan2 uuid;
begin
  perform set_config('role','postgres',true);
  -- Dois empréstimos já devolvidos (histórico): um do aluno 1, outro do aluno 2 (este com multa).
  insert into public.loans (book_id,user_id,borrowed_at,due_at,returned_at) values
    (BK,A1::uuid,'2026-10-01 12:00-03','2026-10-08 12:00-03','2026-10-07 12:00-03') returning id into loan1;
  insert into public.loans (book_id,user_id,borrowed_at,due_at,returned_at) values
    (BK,A2::uuid,'2026-10-02 12:00-03','2026-10-09 12:00-03','2026-10-12 12:00-03') returning id into loan2;
  insert into public.fines (loan_id,user_id,days_late,amount_cents) values (loan2,A2::uuid,3,300);

  perform pg_temp.as_user(A1); select count(*) into c from public.loans where id in (loan1, loan2);
  perform pg_temp.say('aluno NÃO vê o histórico do livro (só o próprio empréstimo)', c=1);
  select count(*) into c from public.loans where user_id=A2::uuid;
  perform pg_temp.say('aluno NÃO consulta o histórico de outra pessoa', c=0);
  select count(*) into c from public.fines;
  perform pg_temp.say('aluno NÃO vê multa de outra pessoa', c=0);

  perform pg_temp.as_user(T1); select count(*) into c from public.loans where id in (loan1, loan2);
  perform pg_temp.say('professor NÃO vê o histórico de ninguém além do próprio', c=0);

  perform pg_temp.as_user(L1);
  select count(*) into c from public.loans where id in (loan1, loan2);
  perform pg_temp.say('bibliotecária vê o histórico por livro (2 empréstimos)', c=2);
  select count(*) into c from public.loans where user_id=A2::uuid and id in (loan1, loan2);
  perform pg_temp.say('bibliotecária vê o histórico por usuário', c=1);
  -- Período em horário de Brasília: 02/10 inteiro (início inclusivo, fim = começo do dia seguinte).
  select count(*) into c from public.loans where id in (loan1, loan2) and borrowed_at >= '2026-10-02T00:00:00-03:00' and borrowed_at < '2026-10-03T00:00:00-03:00';
  perform pg_temp.say('filtro de período por dia de Brasília', c=1);
  select count(*) into c from public.loans l join public.fines f on f.loan_id=l.id where f.paid_at is null;
  perform pg_temp.say('bibliotecária filtra empréstimos com multa em aberto', c=1);
end $$;
