-- Novidades do acervo numa chamada (card 0267): new_arrivals devolve os livros ativos COM capa, do mais novo ao mais antigo,
-- com a mesma disponibilidade de book_availability_for_books, e só para quem está logado com perfil ativo.
-- Rode em banco novo, depois de aplicar TODAS as migrations (inclui 20261114100000). Cada linha mostra PASS ou FAIL.
-- NÃO rode no projeto real do Supabase.
insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-0000000000d1','novidades-aluno@x.com','{"full_name":"Aluno Novidades"}'),
 ('00000000-0000-0000-0000-0000000000d2','novidades-outro@x.com','{"full_name":"Outro Aluno"}');
update public.profiles set active = false where id = '00000000-0000-0000-0000-0000000000d2';
insert into public.books (id,title,author,code,quantity,cover_url,status,created_at) values
 ('b0000000-0000-0000-0000-0000000000d1','Novo com capa','A','N-001',2,'https://x/1.jpg','active', now() + interval '3 days'),
 ('b0000000-0000-0000-0000-0000000000d2','Mais novo emprestado','A','N-002',1,'https://x/2.jpg','active', now() + interval '4 days'),
 ('b0000000-0000-0000-0000-0000000000d3','Sem capa','A','N-003',1,null,'active', now() + interval '5 days'),
 ('b0000000-0000-0000-0000-0000000000d4','Inativo com capa','A','N-004',1,'https://x/4.jpg','inactive', now() + interval '6 days');

create function pg_temp.as_user(u text) returns void language plpgsql as $$
begin perform set_config('role','authenticated',true); perform set_config('request.jwt.claim.sub',u,true); end $$;
create function pg_temp.as_anon() returns void language plpgsql as $$
begin perform set_config('role','anon',true); perform set_config('request.jwt.claim.sub','',true); end $$;
create function pg_temp.as_postgres() returns void language plpgsql as $$
begin perform set_config('role','postgres',true); perform set_config('request.jwt.claim.sub','',true); end $$;
create function pg_temp.say(n text, ok boolean) returns void language plpgsql as $$
begin raise notice '% %', case when ok then 'PASS ' else 'FAIL ' end, n; end $$;
create function pg_temp.err(cmd text) returns text language plpgsql as $$
begin execute cmd; return 'ok'; exception when others then return sqlerrm; end $$;

do $$
declare
  A1 text := '00000000-0000-0000-0000-0000000000d1'; A2 text := '00000000-0000-0000-0000-0000000000d2';
  r record; n int; ids uuid[]; a record; b record;
begin
  perform pg_temp.as_postgres();
  insert into public.loans (book_id,user_id,borrowed_at,due_at)
    values ('b0000000-0000-0000-0000-0000000000d2', A1::uuid, now(), now() + interval '5 days');

  perform pg_temp.as_user(A1);
  select array_agg(id order by ord) into ids from (select id, row_number() over () as ord from public.new_arrivals(2)) s;
  perform pg_temp.say('devolve só ativos com capa, do mais novo ao mais antigo',
    ids = array['b0000000-0000-0000-0000-0000000000d2','b0000000-0000-0000-0000-0000000000d1']::uuid[]);

  select count(*) into n from public.new_arrivals(1);
  perform pg_temp.say('respeita o limite pedido', n = 1);
  select count(*) into n from public.new_arrivals(1000);
  perform pg_temp.say('limite máximo de 20', n <= 20);
  select count(*) into n from public.new_arrivals(null);
  perform pg_temp.say('limite nulo usa 5', n <= 5 and n > 0);

  -- Mesma disponibilidade da função usada antes (book_availability_for_books).
  select * into a from public.new_arrivals(2) where id = 'b0000000-0000-0000-0000-0000000000d2';
  select * into b from public.book_availability_for_books(array['b0000000-0000-0000-0000-0000000000d2']::uuid[]);
  perform pg_temp.say('disponibilidade igual à de book_availability_for_books',
    a.open_loans = b.open_loans and a.has_active_reservation = b.has_active_reservation and a.next_due_at = b.next_due_at and a.open_loans = 1);

  perform pg_temp.as_anon();
  perform pg_temp.say('anônimo não executa', pg_temp.err('select * from public.new_arrivals(5)') like '%permission denied%');

  perform pg_temp.as_user(A2);
  perform pg_temp.say('perfil inativo é recusado', pg_temp.err('select * from public.new_arrivals(5)') like '%forbidden%');
  perform pg_temp.as_postgres();
end $$;
