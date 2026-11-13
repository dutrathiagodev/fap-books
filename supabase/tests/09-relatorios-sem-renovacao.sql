-- Testes: os relatórios de reservas pedagógicas não contam nem listam os pedidos de renovação (cards 0053 e 0055).
-- Rode num Postgres de teste, em banco novo, depois de aplicar TODAS as migrations (inclui 20261113600000).
-- Cada linha mostra PASS ou FAIL.

insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-0000000000e1','rp@x.com','{"full_name":"Paulo Professor"}'),
 ('00000000-0000-0000-0000-0000000000e2','rl@x.com','{"full_name":"Dora Bibliotecária"}'),
 ('00000000-0000-0000-0000-0000000000e3','ra@x.com','{"full_name":"Ana Aluna"}');
update public.profiles set role = 'teacher' where id = '00000000-0000-0000-0000-0000000000e1';
update public.profiles set role = 'librarian', job_title = 'Auxiliar' where id = '00000000-0000-0000-0000-0000000000e2';

create function pg_temp.as_user(u text) returns void language plpgsql as $$
begin perform set_config('role','authenticated',true); perform set_config('request.jwt.claim.sub',u,true); end $$;
create function pg_temp.as_anon() returns void language plpgsql as $$
begin perform set_config('role','anon',true); perform set_config('request.jwt.claim.sub','',true); end $$;
create function pg_temp.as_admin() returns void language plpgsql as $$
begin perform set_config('role','postgres',true); perform set_config('request.jwt.claim.sub','',true); end $$;
create function pg_temp.say(n text, ok boolean) returns void language plpgsql as $$
begin raise notice '% %', case when ok then 'PASS ' else 'FAIL ' end, n; end $$;
create function pg_temp.err(cmd text) returns text language plpgsql as $$
begin execute cmd; return 'ok'; exception when others then return sqlerrm; end $$;

insert into public.books (id, title, author, code, quantity, status, category) values
 ('b0000000-0000-0000-0000-0000000000e1','Livro Um','Autor','RR-001',2,'active','Computação'),
 ('b0000000-0000-0000-0000-0000000000e2','Livro Dois','Autor','RR-002',2,'active','Computação');

do $$
declare
  PROF text:='00000000-0000-0000-0000-0000000000e1'; LIB text:='00000000-0000-0000-0000-0000000000e2';
  ALUNO text:='00000000-0000-0000-0000-0000000000e3';
  l1 uuid:='b0000000-0000-0000-0000-0000000000e1'; l2 uuid:='b0000000-0000-0000-0000-0000000000e2';
  today date := (now() at time zone 'America/Sao_Paulo')::date;
  orig public.pedagogical_reservations; ren public.pedagogical_reservations; n int; r record; held_before int; held_after int;
begin
  perform pg_temp.as_user(PROF);
  orig := public.request_pedagogical_reservation(array[l1, l2], today + 1, 10, 'Redes');
  perform pg_temp.as_user(LIB);
  orig := public.decide_pedagogical_reservation(orig.id, true);
  perform pg_temp.as_admin();
  update public.pedagogical_reservations set start_date = today - 5 where id = orig.id;
  perform pg_temp.as_user(LIB);
  select coalesce(sum(held), 0) into held_before from public.report_inventory(100, 0);

  perform pg_temp.as_user(PROF);
  ren := public.request_pedagogical_renewal(orig.id, 7);   -- pendente
  perform pg_temp.as_user(LIB);
  perform pg_temp.say('com renovação pendente a lista tem só a reserva original', (select count(*) from public.report_pedagogical()) = 1);
  perform pg_temp.say('o total da lista também é 1', (select total_count from public.report_pedagogical() limit 1) = 1);
  perform pg_temp.say('a lista traz os títulos da original (nunca uma linha sem título)',
    not exists (select 1 from public.report_pedagogical() where book_count = 0 or cardinality(book_titles) = 0));
  perform pg_temp.say('a renovação não aparece na lista', not exists (select 1 from public.report_pedagogical() where reservation_id = ren.id));
  perform pg_temp.say('contagem por situação: só a original (aprovada), sem pendente',
    (select count(*) from public.report_pedagogical_counts()) = 1 and (select total from public.report_pedagogical_counts() where status = 'approved') = 1);
  perform pg_temp.say('filtro "pending" não encontra a renovação', (select count(*) from public.report_pedagogical(null, null, 'pending')) = 0);

  -- Renovação aprovada também fica de fora, e o inventário continua com 1 exemplar guardado por livro.
  perform public.decide_pedagogical_reservation(ren.id, true);
  perform pg_temp.say('renovação aprovada não vira segunda reserva aprovada', (select count(*) from public.report_pedagogical(null, null, 'approved')) = 1);
  perform pg_temp.say('contagem de aprovadas continua 1', (select total from public.report_pedagogical_counts() where status = 'approved') = 1);
  select coalesce(sum(held), 0) into held_after from public.report_inventory(100, 0);
  perform pg_temp.say('o inventário não duplica o exemplar guardado', held_after = held_before and held_after = 2);

  -- Uma segunda reserva de verdade continua contando normalmente.
  perform pg_temp.as_user(PROF);
  perform public.request_pedagogical_reservation(array[l1], today + 3, 5);
  perform pg_temp.as_user(LIB);
  perform pg_temp.say('uma reserva nova continua entrando na lista (2)', (select count(*) from public.report_pedagogical()) = 2);

  -- Permissões iguais às de antes.
  perform pg_temp.as_user(ALUNO);
  perform pg_temp.say('aluno continua sem acesso', pg_temp.err('select * from public.report_pedagogical()') = 'forbidden'
    and pg_temp.err('select * from public.report_pedagogical_counts()') = 'forbidden');
  perform pg_temp.as_anon();
  perform pg_temp.say('anônimo nem executa', pg_temp.err('select * from public.report_pedagogical()') like 'permission denied%');
  perform pg_temp.as_admin();
  perform pg_temp.say('as funções continuam security definer com search_path vazio',
    (select count(*) from pg_proc where proname in ('report_pedagogical', 'report_pedagogical_counts') and prosecdef
       and 'search_path=""' = any (proconfig)) = 2);
end $$;
