-- Testes das regras de acesso (RLS). Rode depois de aplicar as migrations. Cada linha mostra PASS ou FAIL.
-- Rode uma vez por banco novo (cria usuários de teste). Veja docs/database/modelo-de-dados.md.
-- usuários de teste (o trigger cria o perfil como "student")
insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-000000000001','aluno1@x.com','{"full_name":"Aluno Um"}'),
 ('00000000-0000-0000-0000-000000000002','aluno2@x.com','{"role":"librarian"}'),
 ('00000000-0000-0000-0000-000000000003','prof@x.com','{}'),
 ('00000000-0000-0000-0000-000000000004','biblio@x.com','{}');
update public.profiles set role='teacher' where id='00000000-0000-0000-0000-000000000003';
update public.profiles set role='librarian', job_title='Chefe da biblioteca' where id='00000000-0000-0000-0000-000000000004';
insert into public.books (id,title,author,code,quantity) values ('b0000000-0000-0000-0000-000000000001','Dom Casmurro','Machado de Assis','C-001',2);

create function pg_temp.as_user(u text) returns void language plpgsql as $$
begin perform set_config('role','authenticated',true); perform set_config('request.jwt.claim.sub',u,true); end $$;
create function pg_temp.say(n text, ok boolean) returns void language plpgsql as $$
begin raise notice '% %', case when ok then 'PASS ' else 'FAIL ' end, n; end $$;

do $$
declare A1 text:='00000000-0000-0000-0000-000000000001'; A2 text:='00000000-0000-0000-0000-000000000002';
        T1 text:='00000000-0000-0000-0000-000000000003'; L1 text:='00000000-0000-0000-0000-000000000004';
        c int; denied boolean; r public.user_role; rid uuid;
begin
  -- perfis
  select role into r from public.profiles where id=A2::uuid;
  perform pg_temp.say('papel vindo do cadastro é ignorado (continua student)', r='student');
  perform pg_temp.as_user(A1); select count(*) into c from public.profiles;
  perform pg_temp.say('aluno vê só o próprio perfil', c=1);
  update public.profiles set role='librarian' where id=A1::uuid; get diagnostics c = row_count;
  perform pg_temp.say('aluno NÃO consegue virar bibliotecária', c=0);
  perform set_config('role','postgres',true); select role into r from public.profiles where id=A1::uuid;
  perform pg_temp.say('papel do aluno segue student', r='student');
  perform pg_temp.as_user(L1); select count(*) into c from public.profiles;
  perform pg_temp.say('bibliotecária vê todos os perfis', c=4);

  -- livros
  perform pg_temp.as_user(A1); select count(*) into c from public.books;
  perform pg_temp.say('aluno consulta o acervo', c=1);
  denied:=false; begin insert into public.books(title,author,code) values('X','Y','C-9'); exception when others then denied:=true; end;
  perform pg_temp.say('aluno NÃO cadastra livro', denied);
  perform pg_temp.as_user(L1);
  insert into public.books(title,author,code) values('Quincas Borba','Machado','C-002');
  perform pg_temp.say('bibliotecária cadastra livro', true);
  denied:=false; begin insert into public.books(title,author,code,quantity) values('Z','W','C-3',-1); exception when others then denied:=true; end;
  perform pg_temp.say('quantidade negativa é recusada', denied);

  -- empréstimos e multas
  insert into public.loans(book_id,user_id,due_at,created_by) values ('b0000000-0000-0000-0000-000000000001',A1::uuid, now()+interval '7 days', L1::uuid);
  perform pg_temp.say('bibliotecária registra empréstimo', true);
  perform pg_temp.as_user(A1); select count(*) into c from public.loans;
  perform pg_temp.say('aluno 1 vê o próprio empréstimo', c=1);
  perform pg_temp.as_user(A2); select count(*) into c from public.loans;
  perform pg_temp.say('aluno 2 NÃO vê empréstimo do aluno 1', c=0);
  denied:=false; begin insert into public.loans(book_id,user_id,due_at) values ('b0000000-0000-0000-0000-000000000001',A2::uuid, now()+interval '7 days'); exception when others then denied:=true; end;
  perform pg_temp.say('aluno NÃO registra empréstimo para si', denied);

  -- reservas comuns
  perform pg_temp.as_user(A1);
  insert into public.reservations(book_id,user_id) values ('b0000000-0000-0000-0000-000000000001',A1::uuid);
  perform pg_temp.say('aluno reserva livro para si', true);
  denied:=false; begin insert into public.reservations(book_id,user_id) values ('b0000000-0000-0000-0000-000000000001',A2::uuid); exception when others then denied:=true; end;
  perform pg_temp.say('aluno NÃO reserva em nome de outro', denied);
  denied:=false; begin insert into public.reservations(book_id,user_id,status) values ('b0000000-0000-0000-0000-000000000001',A1::uuid,'ready'); exception when others then denied:=true; end;
  perform pg_temp.say('aluno NÃO cria reserva já "pronta"', denied);

  -- reserva pedagógica
  perform pg_temp.as_user(A1);
  denied:=false; begin insert into public.pedagogical_reservations(teacher_id,start_date,days) values (A1::uuid,current_date+5,10); exception when others then denied:=true; end;
  perform pg_temp.say('aluno NÃO pede reserva pedagógica', denied);
  perform pg_temp.as_user(T1);
  insert into public.pedagogical_reservations(teacher_id,start_date,days) values (T1::uuid,current_date+5,30) returning id into rid;
  perform pg_temp.say('professor pede reserva de 30 dias', true);
  denied:=false; begin insert into public.pedagogical_reservations(teacher_id,start_date,days) values (T1::uuid,current_date+5,31); exception when others then denied:=true; end;
  perform pg_temp.say('prazo de 31 dias é recusado (máximo 30)', denied);
  denied:=false; begin insert into public.pedagogical_reservations(teacher_id,start_date,days,status) values (T1::uuid,current_date+5,5,'approved'); exception when others then denied:=true; end;
  perform pg_temp.say('professor NÃO se autoaprova', denied);
  insert into public.pedagogical_reservation_books(reservation_id,book_id) values (rid,'b0000000-0000-0000-0000-000000000001');
  perform pg_temp.say('professor adiciona livro à própria reserva', true);
  update public.pedagogical_reservations set status='approved' where id=rid; get diagnostics c=row_count;
  perform pg_temp.say('professor NÃO altera o status da reserva', c=0);
  perform pg_temp.as_user(L1);
  update public.pedagogical_reservations set status='approved', decided_by=L1::uuid, decided_at=now() where id=rid; get diagnostics c=row_count;
  perform pg_temp.say('bibliotecária aprova a reserva', c=1);
  perform pg_temp.as_user(T1);
  denied:=false; begin insert into public.pedagogical_reservation_books(reservation_id,book_id) values (rid,'b0000000-0000-0000-0000-000000000001'); exception when others then denied:=true; end;
  perform pg_temp.say('livro repetido/depois de aprovada é recusado', denied);

  -- auditoria
  perform pg_temp.as_user(A1);
  insert into public.audit_logs(actor_id,action,entity) values (A1::uuid,'test','books');
  perform pg_temp.say('aluno grava auditoria em seu nome', true);
  denied:=false; begin insert into public.audit_logs(actor_id,action,entity) values (L1::uuid,'fake','books'); exception when others then denied:=true; end;
  perform pg_temp.say('aluno NÃO grava auditoria em nome de outro', denied);
  select count(*) into c from public.audit_logs; perform pg_temp.say('aluno NÃO lê a auditoria', c=0);
  denied:=false; begin update public.audit_logs set action='x'; exception when others then denied:=true; end;
  perform pg_temp.say('auditoria não pode ser editada', denied);
  denied:=false; begin delete from public.audit_logs; exception when others then denied:=true; end;
  perform pg_temp.say('auditoria não pode ser apagada', denied);
  perform pg_temp.as_user(L1); select count(*) into c from public.audit_logs;
  perform pg_temp.say('bibliotecária lê a auditoria', c=1);

  -- anônimo
  perform set_config('role','anon',true);
  denied:=false; begin perform count(*) from public.books; exception when others then denied:=true; end;
  perform pg_temp.say('visitante sem login NÃO acessa o acervo', denied);
end $$;
