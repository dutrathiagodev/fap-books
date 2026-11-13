-- Área do aluno (cards 0212 a 0217): o aluno só lê e renova o que é dele; multa em aberto bloqueia a renovação no banco.
-- Rode em banco novo, depois de aplicar TODAS as migrations (inclui 20261113110000). Cada linha mostra PASS ou FAIL.
-- NÃO rode no projeto real do Supabase.
insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-0000000000a1','aluno1@x.com','{"full_name":"Aluno Um"}'),
 ('00000000-0000-0000-0000-0000000000a2','aluno2@x.com','{"full_name":"Aluno Dois"}'),
 ('00000000-0000-0000-0000-0000000000a3','aluno3@x.com','{"full_name":"Aluno Três"}'),
 ('00000000-0000-0000-0000-0000000000b1','biblio@x.com','{}');
update public.profiles set role='librarian', job_title='Auxiliar' where id='00000000-0000-0000-0000-0000000000b1';
insert into public.books (id,title,author,code,quantity) values
 ('b0000000-0000-0000-0000-0000000000c1','Livro A','Autor','S-001',3),
 ('b0000000-0000-0000-0000-0000000000c2','Livro B','Autor','S-002',3),
 ('b0000000-0000-0000-0000-0000000000c3','Livro C (1 exemplar)','Autor','S-003',1);

create function pg_temp.as_user(u text) returns void language plpgsql as $$
begin perform set_config('role','authenticated',true); perform set_config('request.jwt.claim.sub',u,true); end $$;
create function pg_temp.as_postgres() returns void language plpgsql as $$
begin perform set_config('role','postgres',true); perform set_config('request.jwt.claim.sub','',true); end $$;
create function pg_temp.say(n text, ok boolean) returns void language plpgsql as $$
begin raise notice '% %', case when ok then 'PASS ' else 'FAIL ' end, n; end $$;
create function pg_temp.err(cmd text) returns text language plpgsql as $$
begin execute cmd; return 'ok'; exception when others then return sqlerrm; end $$;

do $$
declare A1 text:='00000000-0000-0000-0000-0000000000a1'; A2 text:='00000000-0000-0000-0000-0000000000a2';
        A3 text:='00000000-0000-0000-0000-0000000000a3';
        BC uuid:='b0000000-0000-0000-0000-0000000000c3'; BA uuid:='b0000000-0000-0000-0000-0000000000c1'; BB uuid:='b0000000-0000-0000-0000-0000000000c2';
        l1 uuid; l2 uuid; l3 uuid; l0 uuid; c int; r text; due0 timestamptz; due1 timestamptz;
begin
  perform pg_temp.as_postgres();
  insert into public.loans (book_id,user_id,borrowed_at,due_at) values (BA,A1::uuid,now(),now()+interval '5 days') returning id into l1;
  insert into public.loans (book_id,user_id,borrowed_at,due_at) values (BA,A2::uuid,now(),now()+interval '5 days') returning id into l2;
  -- Aluno 3: empréstimo no prazo, mas com uma multa em aberto de uma devolução atrasada anterior.
  insert into public.loans (book_id,user_id,borrowed_at,due_at) values (BB,A3::uuid,now(),now()+interval '5 days') returning id into l3;
  insert into public.loans (book_id,user_id,borrowed_at,due_at,returned_at) values (BA,A3::uuid,now()-interval '20 days',now()-interval '13 days',now()-interval '9 days') returning id into l0;
  insert into public.fines (loan_id,user_id,days_late,amount_cents) values (l0,A3::uuid,4,400);
  -- Livro C tem 1 exemplar, emprestado à bibliotecária: os alunos 1 e 2 entram na fila.
  insert into public.loans (book_id,user_id,borrowed_at,due_at) values (BC,'00000000-0000-0000-0000-0000000000b1'::uuid,now(),now()+interval '5 days');
  insert into public.reservations (book_id,user_id,status) values (BC,A1::uuid,'waiting'), (BC,A2::uuid,'waiting');

  -- Leitura: cada aluno vê só o que é dele.
  perform pg_temp.as_user(A1);
  select count(*) into c from public.loans;
  perform pg_temp.say('aluno 1 vê só o empréstimo dele', c=1);
  select count(*) into c from public.loans where user_id=A2::uuid;
  perform pg_temp.say('aluno 1 NÃO vê empréstimo do aluno 2, nem filtrando pelo id dele', c=0);
  select count(*) into c from public.reservations;
  perform pg_temp.say('aluno 1 vê só a reserva dele', c=1);
  select count(*) into c from public.reservations where user_id=A2::uuid;
  perform pg_temp.say('aluno 1 NÃO vê reserva do aluno 2', c=0);
  select count(*) into c from public.fines;
  perform pg_temp.say('aluno 1 NÃO vê multa de ninguém (não tem)', c=0);

  perform pg_temp.as_user(A3);
  select count(*) into c from public.fines;
  perform pg_temp.say('aluno 3 vê a própria multa (1)', c=1);
  perform pg_temp.as_user(A2);
  select count(*) into c from public.fines where user_id=A3::uuid;
  perform pg_temp.say('aluno 2 NÃO vê a multa do aluno 3', c=0);

  -- Renovação: só do próprio empréstimo.
  perform pg_temp.as_user(A1);
  r := pg_temp.err(format('select public.renew_loan(%L)', l2));
  perform pg_temp.say('aluno 1 NÃO renova o empréstimo do aluno 2 (forbidden)', r like '%forbidden%' or r like '%permission%');
  perform pg_temp.as_postgres(); select due_at into due0 from public.loans where id=l1;
  perform pg_temp.as_user(A1);
  r := pg_temp.err(format('select public.renew_loan(%L)', l1));
  perform pg_temp.as_postgres(); select due_at into due1 from public.loans where id=l1;
  perform pg_temp.say('aluno 1 renova o próprio empréstimo (+7 dias)', r='ok' and due1 = due0 + interval '7 days');
  perform pg_temp.as_postgres(); select count(*) into c from public.loans where id=l2 and renewals=0;
  perform pg_temp.say('o empréstimo do aluno 2 ficou intacto', c=1);

  -- Multa em aberto bloqueia a renovação no banco.
  perform pg_temp.as_user(A3);
  r := pg_temp.err(format('select public.renew_loan(%L)', l3));
  perform pg_temp.say('aluno 3 com multa em aberto NÃO renova', r like '%user_has_pending%');
  -- Depois da baixa da multa (feita pela bibliotecária), renova.
  perform pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
  perform public.pay_fine((select id from public.fines where user_id=A3::uuid), gen_random_uuid());
  perform pg_temp.as_user(A3);
  r := pg_temp.err(format('select public.renew_loan(%L)', l3));
  perform pg_temp.say('depois da baixa da multa, aluno 3 renova', r='ok');
end $$;
