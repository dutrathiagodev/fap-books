-- Testes da fila de espera do livro indisponível (cards 0044 e 0045, RF-20).
-- Rode num Postgres de teste, em banco novo, depois de aplicar TODAS as migrations (inclui 20261113400000):
-- veja docs/database/modelo-de-dados.md. Cada linha mostra PASS ou FAIL. A corrida de dois pedidos pelo último
-- exemplar está em 07b-fila-concorrencia.sh.

insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-0000000000b1','a1@x.com','{"full_name":"Ana Aluna"}'),
 ('00000000-0000-0000-0000-0000000000b2','a2@x.com','{"full_name":"Bia Aluna"}'),
 ('00000000-0000-0000-0000-0000000000b3','a3@x.com','{"full_name":"Caio Aluno"}'),
 ('00000000-0000-0000-0000-0000000000b4','prof@x.com','{"full_name":"Paulo Professor"}'),
 ('00000000-0000-0000-0000-0000000000b5','bib@x.com','{"full_name":"Dora Bibliotecária"}'),
 ('00000000-0000-0000-0000-0000000000b6','a6@x.com','{"full_name":"Lia Limite"}'),
 ('00000000-0000-0000-0000-0000000000b7','a7@x.com','{"full_name":"Formando Quatro"}'),
 ('00000000-0000-0000-0000-0000000000b8','a8@x.com','{"full_name":"Ari Atrasado"}'),
 ('00000000-0000-0000-0000-0000000000b9','a9@x.com','{"full_name":"Mara Multada"}'),
 ('00000000-0000-0000-0000-0000000000ba','aa@x.com','{"full_name":"Ivo Inativo"}'),
 ('00000000-0000-0000-0000-0000000000bb','bb@x.com','{"full_name":"Ide Idempotente"}');
update public.profiles set role = 'teacher' where id = '00000000-0000-0000-0000-0000000000b4';
update public.profiles set role = 'librarian', job_title = 'Auxiliar' where id = '00000000-0000-0000-0000-0000000000b5';
update public.profiles set graduating = true where id = '00000000-0000-0000-0000-0000000000b7';
update public.profiles set active = false where id = '00000000-0000-0000-0000-0000000000ba';

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

insert into public.books (id, title, author, code, quantity, status) values
 ('b0000000-0000-0000-0000-0000000000a1','Livro Unico','Autor','Q-001',1,'active'),
 ('b0000000-0000-0000-0000-0000000000a2','Livro Livre','Autor','Q-002',3,'active'),
 ('b0000000-0000-0000-0000-0000000000a3','Livro Inativo','Autor','Q-003',1,'inactive'),
 ('b0000000-0000-0000-0000-0000000000a4','Livro Dois','Autor','Q-004',2,'active'),
 ('b0000000-0000-0000-0000-0000000000a5','Livro Cinco','Autor','Q-005',1,'active'),
 ('b0000000-0000-0000-0000-0000000000c1','Enchente 1','Autor','Q-101',5,'active'),
 ('b0000000-0000-0000-0000-0000000000c2','Enchente 2','Autor','Q-102',5,'active'),
 ('b0000000-0000-0000-0000-0000000000c3','Enchente 3','Autor','Q-103',5,'active'),
 ('b0000000-0000-0000-0000-0000000000c4','Enchente 4','Autor','Q-104',5,'active');

do $$
declare
  A1 text:='00000000-0000-0000-0000-0000000000b1'; A2 text:='00000000-0000-0000-0000-0000000000b2';
  A3 text:='00000000-0000-0000-0000-0000000000b3'; PR text:='00000000-0000-0000-0000-0000000000b4';
  BIB text:='00000000-0000-0000-0000-0000000000b5'; A6 text:='00000000-0000-0000-0000-0000000000b6';
  A7 text:='00000000-0000-0000-0000-0000000000b7'; A8 text:='00000000-0000-0000-0000-0000000000b8';
  A9 text:='00000000-0000-0000-0000-0000000000b9'; AI text:='00000000-0000-0000-0000-0000000000ba';
  IDE text:='00000000-0000-0000-0000-0000000000bb';
  uni uuid:='b0000000-0000-0000-0000-0000000000a1'; livre uuid:='b0000000-0000-0000-0000-0000000000a2';
  cinco uuid:='b0000000-0000-0000-0000-0000000000a5';
  ina uuid:='b0000000-0000-0000-0000-0000000000a3'; dois uuid:='b0000000-0000-0000-0000-0000000000a4';
  e1 uuid:='b0000000-0000-0000-0000-0000000000c1'; e2 uuid:='b0000000-0000-0000-0000-0000000000c2';
  e3 uuid:='b0000000-0000-0000-0000-0000000000c3'; e4 uuid:='b0000000-0000-0000-0000-0000000000c4';
  loan1 public.loans; r2 public.reservations; r3 public.reservations; rp public.reservations; rk public.reservations;
  rk2 public.reservations; x public.reservations; k uuid := gen_random_uuid(); n int; s record; ldoc uuid;
begin
  ---------------------------------------------------------------- QUEM PODE RESERVAR E QUANDO
  perform pg_temp.as_anon();
  perform pg_temp.say('anônimo NÃO executa reserve_book',
    pg_temp.err(format('select public.reserve_book(%L)', uni)) like 'permission denied%');
  perform pg_temp.as_user(AI);
  perform pg_temp.say('usuário inativo NÃO reserva', pg_temp.err(format('select public.reserve_book(%L)', uni)) = 'forbidden');

  perform pg_temp.as_user(A1);
  perform pg_temp.say('livro com exemplar livre NÃO se reserva (empreste em vez disso)',
    pg_temp.err(format('select public.reserve_book(%L)', livre)) = 'book_available');

  -- A funcionária empresta o único exemplar para a Ana: o livro fica indisponível.
  perform pg_temp.as_user(BIB);
  loan1 := public.create_loan(uni, A1::uuid);
  perform pg_temp.as_user(A1);
  perform pg_temp.say('quem está com o livro NÃO o reserva', pg_temp.err(format('select public.reserve_book(%L)', uni)) = 'already_borrowed');

  perform pg_temp.as_user(A2);
  perform pg_temp.say('livro inativo NÃO se reserva', pg_temp.err(format('select public.reserve_book(%L)', ina)) = 'book_inactive');
  perform pg_temp.say('livro inexistente', pg_temp.err(format('select public.reserve_book(%L)', gen_random_uuid())) = 'book_not_found');

  ---------------------------------------------------------------- FILA POR ORDEM DE CHEGADA
  r2 := public.reserve_book(uni);
  perform pg_temp.say('aluna entra na fila (waiting)', r2.status = 'waiting' and r2.user_id = A2::uuid);
  perform pg_temp.say('segunda reserva do mesmo livro pela mesma pessoa é recusada',
    pg_temp.err(format('select public.reserve_book(%L)', uni)) = 'already_reserved');
  perform pg_temp.as_admin();
  perform pg_temp.say('índice único parcial recusa a duplicata mesmo gravando direto',
    pg_temp.err(format('insert into public.reservations (book_id, user_id) values (%L, %L)', uni, A2)) like '%reservations_one_active_per_user_book%');

  perform pg_temp.as_user(A3);
  r3 := public.reserve_book(uni);
  perform pg_temp.as_user(PR);
  rp := public.reserve_book(uni);
  perform pg_temp.say('professor também entra na fila', rp.status = 'waiting');

  -- Idempotência: a mesma chave não cria outra reserva (clique duplo, retry de rede).
  perform pg_temp.as_user(IDE);
  rk := public.reserve_book(uni, null, k);
  rk2 := public.reserve_book(uni, null, k);
  perform pg_temp.as_admin();
  select count(*) into n from public.reservations where user_id = IDE::uuid and book_id = uni;
  perform pg_temp.say('mesma chave de idempotência: a mesma reserva e só uma linha', rk.id = rk2.id and n = 1);
  perform pg_temp.as_user(IDE);
  perform pg_temp.say('chave reaproveitada em outra ação é recusada',
    pg_temp.err(format('select public.cancel_reservation(%L, %L)', rk.id, k)) = 'idempotency_key_reused');

  ---------------------------------------------------------------- POSIÇÃO, RLS E AUDITORIA
  perform pg_temp.as_user(A3);
  select * into s from public.list_my_reservations();
  perform pg_temp.say('A3 é a 2ª da fila (posição por ordem de chegada)', s.queue_position = 2 and s.status = 'waiting' and s.title = 'Livro Unico');
  select count(*) into n from public.list_my_reservations();
  perform pg_temp.say('list_my_reservations devolve só as reservas de quem chama', n = 1);
  select * into s from public.book_reservation_status(uni);
  perform pg_temp.say('book_reservation_status: fila de 4 e a minha posição é 2', s.queue_size = 4 and s.my_position = 2 and s.my_reservation_id = r3.id);
  select count(*) into n from public.reservations;
  perform pg_temp.say('RLS: aluno vê só a própria reserva na tabela', n = 1);
  -- A8 não tem reserva e o livro está sem exemplar: o gatilho deixa passar e quem barra é o RLS (não há policy de insert).
  perform pg_temp.as_user(A8);
  perform pg_temp.say('RLS: aluno NÃO grava direto na tabela de reservas',
    pg_temp.err(format('insert into public.reservations (book_id, user_id) values (%L, %L)', uni, A8)) like '%row-level security%');
  perform pg_temp.say('RLS: aluno NÃO altera reserva de outra pessoa (nenhuma linha afetada)',
    pg_temp.err(format('with u as (update public.reservations set status = %L where id = %L returning 1) select 1/(case when count(*)=0 then 1 else 0 end) from u', 'cancelled', r2.id)) = 'ok');
  perform pg_temp.as_admin();
  perform pg_temp.say('a reserva alheia continua intacta', (select status from public.reservations where id = r2.id) = 'waiting');
  perform pg_temp.as_user(A2);
  select count(*) into n from public.book_reservation_status(dois);
  perform pg_temp.say('book_reservation_status de livro sem fila: tamanho 0 e sem reserva minha',
    (select queue_size = 0 and my_reservation_id is null from public.book_reservation_status(dois)));
  perform pg_temp.as_user(BIB);
  select count(*) into n from public.reservations;
  perform pg_temp.say('funcionária vê a fila inteira (4)', n = 4);

  ---------------------------------------------------------------- LIMITE (3 / 4) E BLOQUEIO POR ATRASO OU MULTA
  perform pg_temp.as_user(BIB);
  perform public.create_loan(e1, A6::uuid); perform public.create_loan(e2, A6::uuid); perform public.create_loan(e3, A6::uuid);
  perform public.create_loan(e1, A7::uuid); perform public.create_loan(e2, A7::uuid); perform public.create_loan(e3, A7::uuid);
  perform pg_temp.as_user(A6);
  perform pg_temp.say('limite de 3 livros: quem já está com 3 NÃO entra na fila',
    pg_temp.err(format('select public.reserve_book(%L)', uni)) = 'loan_limit_reached');
  perform pg_temp.as_user(A7);
  rk := public.reserve_book(uni);
  perform pg_temp.say('formando (limite 4) com 3 livros entra na fila', rk.status = 'waiting');
  perform pg_temp.as_user(BIB);
  perform public.cancel_reservation(rk.id);

  -- Atraso: empréstimo vencido gravado direto (histórico de teste); multa em aberto idem.
  perform pg_temp.as_admin();
  insert into public.loans (book_id, user_id, borrowed_at, due_at) values (e4, A8::uuid, now() - interval '20 days', now() - interval '13 days');
  insert into public.loans (id, book_id, user_id, borrowed_at, due_at, returned_at)
    values ('f0000000-0000-0000-0000-0000000000f1', e4, A9::uuid, now() - interval '20 days', now() - interval '13 days', now() - interval '10 days');
  insert into public.fines (loan_id, user_id, days_late, amount_cents) values ('f0000000-0000-0000-0000-0000000000f1', A9::uuid, 3, 300);
  perform pg_temp.as_user(A8);
  perform pg_temp.say('empréstimo em atraso bloqueia a reserva', pg_temp.err(format('select public.reserve_book(%L)', uni)) = 'user_has_pending');
  perform pg_temp.as_user(A9);
  perform pg_temp.say('multa em aberto bloqueia a reserva', pg_temp.err(format('select public.reserve_book(%L)', uni)) = 'user_has_pending');
  perform pg_temp.as_user(A2);
  perform pg_temp.say('aluno NÃO reserva em nome de outra pessoa', pg_temp.err(format('select public.reserve_book(%L, %L)', uni, A9)) = 'forbidden');
  perform pg_temp.as_user(BIB);
  perform pg_temp.say('funcionária reserva por outra pessoa, mas a regra vale (multa bloqueia)',
    pg_temp.err(format('select public.reserve_book(%L, %L)', uni, A9)) = 'user_has_pending');

  ---------------------------------------------------------------- CANCELAR
  perform pg_temp.as_user(A3);
  perform pg_temp.say('aluno NÃO cancela a reserva de outra pessoa', pg_temp.err(format('select public.cancel_reservation(%L)', r2.id)) = 'forbidden');
  perform pg_temp.as_user(IDE);
  x := public.cancel_reservation(rk2.id, gen_random_uuid());
  perform pg_temp.say('aluno cancela a própria reserva', x.status = 'cancelled');
  perform pg_temp.say('cancelar de novo a mesma reserva não faz nada', (public.cancel_reservation(rk2.id)).status = 'cancelled');
  perform pg_temp.as_user(A3);
  perform pg_temp.say('A3 passou a 2ª (A2, A3, PR): posição continua 2', (select queue_position from public.list_my_reservations() where status = 'waiting') = 2);

  ---------------------------------------------------------------- DEVOLUÇÃO PROMOVE O PRIMEIRO DA FILA
  perform pg_temp.as_user(BIB);
  perform public.return_loan(loan1.id, gen_random_uuid());
  perform pg_temp.as_admin();
  select * into x from public.reservations where id = r2.id;
  perform pg_temp.say('devolução promove a 1ª da fila: status ready', x.status = 'ready');
  perform pg_temp.say('prazo de retirada = 2 dias depois do aviso', x.ready_at is not null and x.expires_at = x.ready_at + interval '2 days');
  perform pg_temp.say('a 2ª da fila segue aguardando', (select status from public.reservations where id = r3.id) = 'waiting');
  perform pg_temp.say('auditoria registrou reservation_ready só com ids',
    exists (select 1 from public.audit_logs where action = 'reservation_ready' and entity_id = r2.id
            and details ?& array['reservation_id','book_id','user_id'] and (select count(*) from jsonb_object_keys(details)) = 3));
  perform pg_temp.as_user(A2);
  select * into s from public.list_my_reservations();
  perform pg_temp.say('"Minhas reservas": pronta, posição 0, com data limite', s.status = 'ready' and s.queue_position = 0 and s.expires_at = x.expires_at);
  perform pg_temp.as_user(BIB);
  perform pg_temp.say('o exemplar guardado NÃO vai para quem não reservou',
    pg_temp.err(format('select public.create_loan(%L, %L)', uni, IDE)) = 'copy_reserved_for_others');
  perform pg_temp.say('nem para o próximo da fila (a vez é da 1ª)',
    pg_temp.err(format('select public.create_loan(%L, %L)', uni, A3)) in ('copy_reserved_for_others', 'no_copy_available'));
  perform pg_temp.as_user(A3);
  perform pg_temp.say('prontas não contam como fila de espera para a posição: A3 agora é a 1ª em espera',
    (select queue_position from public.list_my_reservations() where status = 'waiting') = 1);

  ---------------------------------------------------------------- FUNCIONÁRIA: EXPIRAR E CANCELAR
  perform pg_temp.as_user(A2);
  perform pg_temp.say('aluno NÃO expira reserva', pg_temp.err(format('select public.expire_reservation(%L)', r2.id)) = 'forbidden');
  perform pg_temp.as_user(BIB);
  perform pg_temp.say('só reserva pronta expira (a em espera não)', pg_temp.err(format('select public.expire_reservation(%L)', r3.id)) = 'reservation_not_ready');
  -- Passou do prazo: o próximo empréstimo (ou qualquer reserva) expira a vencida e passa a vez.
  perform pg_temp.as_admin();
  update public.reservations set expires_at = now() - interval '1 minute' where id = r2.id;
  perform pg_temp.say('antes de rodar a rotina a vencida ainda consta como pronta', (select status from public.reservations where id = r2.id) = 'ready');
  perform pg_temp.say('expire_overdue_reservations trata 1 livro', public.expire_overdue_reservations() = 1);
  perform pg_temp.say('a vencida virou expired', (select status from public.reservations where id = r2.id) = 'expired');
  perform pg_temp.say('a vez passou para A3 (ready com prazo novo)',
    (select status = 'ready' and expires_at > now() + interval '1 day' from public.reservations where id = r3.id));
  perform pg_temp.say('rodar a rotina de novo não muda nada', public.expire_overdue_reservations() = 0);
  perform pg_temp.say('auditoria registrou reservation_expired',
    exists (select 1 from public.audit_logs where action = 'reservation_expired' and entity_id = r2.id));
  perform pg_temp.as_user(A2);
  perform pg_temp.say('reserva expirada não se cancela', pg_temp.err(format('select public.cancel_reservation(%L)', r2.id)) = 'reservation_expired');
  perform pg_temp.as_user(BIB);
  perform pg_temp.say('funcionária expira a pronta de A3', (public.expire_reservation(r3.id, gen_random_uuid())).status = 'expired');
  perform pg_temp.as_admin();
  perform pg_temp.say('e a vez passou para o professor', (select status from public.reservations where id = rp.id) = 'ready');
  perform pg_temp.as_user(BIB);
  perform pg_temp.say('funcionária cancela a reserva de outra pessoa', (public.cancel_reservation(rp.id)).status = 'cancelled');
  perform pg_temp.as_admin();
  perform pg_temp.say('sem fila, o exemplar volta à estante (nenhuma ativa)', (select count(*) from public.reservations where book_id = uni and status in ('waiting','ready')) = 0);

  ---------------------------------------------------------------- RESERVA VIRA EMPRÉSTIMO
  perform pg_temp.as_user(BIB);
  loan1 := public.create_loan(cinco, A1::uuid);
  perform pg_temp.as_user(A2);
  rk := public.reserve_book(cinco);
  perform pg_temp.as_user(BIB);
  perform public.return_loan(loan1.id);
  perform pg_temp.say('devolver o livro deixa a reserva pronta', (select status from public.reservations where id = rk.id) = 'ready');
  perform public.create_loan(cinco, A2::uuid);
  perform pg_temp.say('a funcionária empresta para quem reservou: a reserva vira fulfilled',
    (select status from public.reservations where id = rk.id) = 'fulfilled');
  perform pg_temp.say('A2 passa a ter o empréstimo aberto', (select count(*) from public.loans where user_id = A2::uuid and book_id = cinco and returned_at is null) = 1);

  ---------------------------------------------------------------- PERMISSÕES DAS FUNÇÕES INTERNAS E AUDITORIA
  perform pg_temp.as_user(BIB);
  perform pg_temp.say('app NÃO executa expire_overdue_reservations', pg_temp.err('select public.expire_overdue_reservations()') like 'permission denied%');
  perform pg_temp.say('app NÃO executa promote_reservations', pg_temp.err(format('select public.promote_reservations(%L)', uni)) like 'permission denied%');
  perform pg_temp.as_admin();
  perform pg_temp.say('auditoria: criada, cancelada, pronta e expirada existem',
    (select count(distinct action) from public.audit_logs where action in ('reservation_created','reservation_cancelled','reservation_ready','reservation_expired')) = 4);
  perform pg_temp.say('auditoria só guarda ids nas reservas (3 chaves)',
    not exists (select 1 from public.audit_logs where entity = 'reservations' and (select count(*) from jsonb_object_keys(details)) <> 3));
end $$;
