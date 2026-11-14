-- Testes da renovação da reserva pedagógica (cards 0053 e 0055, parte do RF-32).
-- Rode num Postgres de teste, em banco novo, depois de aplicar TODAS as migrations (inclui 20261113500000):
-- veja docs/database/modelo-de-dados.md. Cada linha mostra PASS ou FAIL. A corrida entre pedidos e entre aprovar e
-- devolver está em 08b-renovacao-concorrencia.sh.

insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-0000000000c1','p1@x.com','{"full_name":"Paulo Professor"}'),
 ('00000000-0000-0000-0000-0000000000c2','p2@x.com','{"full_name":"Priscila Professora"}'),
 ('00000000-0000-0000-0000-0000000000c3','aluno@x.com','{"full_name":"Ana Aluna"}'),
 ('00000000-0000-0000-0000-0000000000c4','bib@x.com','{"full_name":"Dora Bibliotecária"}');
update public.profiles set role = 'teacher' where id in ('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000c2');
update public.profiles set role = 'librarian', job_title = 'Auxiliar' where id = '00000000-0000-0000-0000-0000000000c4';

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
 ('b0000000-0000-0000-0000-0000000000d1','Livro A','Autor','RN-001',1,'active'),
 ('b0000000-0000-0000-0000-0000000000d2','Livro B','Autor','RN-002',2,'active');

do $$
declare
  P1 text:='00000000-0000-0000-0000-0000000000c1'; P2 text:='00000000-0000-0000-0000-0000000000c2';
  ALUNO text:='00000000-0000-0000-0000-0000000000c3'; BIB text:='00000000-0000-0000-0000-0000000000c4';
  la uuid:='b0000000-0000-0000-0000-0000000000d1'; lb uuid:='b0000000-0000-0000-0000-0000000000d2';
  today date := (now() at time zone 'America/Sao_Paulo')::date;
  orig public.pedagogical_reservations; r1 public.pedagogical_reservations; r2 public.pedagogical_reservations;
  r3 public.pedagogical_reservations; x public.pedagogical_reservations; k uuid := gen_random_uuid(); n int;
begin
  ---------------------------------------------------------------- PREPARO: reserva aprovada de A e B
  perform pg_temp.as_user(P1);
  orig := public.request_pedagogical_reservation(array[la, lb], today + 1, 10, 'Disciplina X');
  perform pg_temp.as_user(BIB);
  orig := public.decide_pedagogical_reservation(orig.id, true);
  perform pg_temp.say('reserva original aprovada', orig.status = 'approved');

  ---------------------------------------------------------------- QUEM PODE E QUANDO
  perform pg_temp.as_user(P1);
  perform pg_temp.say('fora da janela (fim daqui a 11 dias) a renovação é recusada',
    pg_temp.err(format('select public.request_pedagogical_renewal(%L, 5)', orig.id)) = 'renewal_too_early');
  -- A reserva está no meio do período: começou há 5 dias, termina daqui a 5.
  perform pg_temp.as_admin();
  update public.pedagogical_reservations set start_date = today - 5 where id = orig.id;

  perform pg_temp.as_anon();
  perform pg_temp.say('anônimo NÃO executa a renovação', pg_temp.err(format('select public.request_pedagogical_renewal(%L, 5)', orig.id)) like 'permission denied%');
  perform pg_temp.as_user(ALUNO);
  perform pg_temp.say('aluno NÃO pede renovação', pg_temp.err(format('select public.request_pedagogical_renewal(%L, 5)', orig.id)) = 'forbidden');
  perform pg_temp.as_user(BIB);
  perform pg_temp.say('funcionária NÃO usa o pedido online do professor', pg_temp.err(format('select public.request_pedagogical_renewal(%L, 5)', orig.id)) = 'forbidden');
  perform pg_temp.as_user(P2);
  perform pg_temp.say('outro professor NÃO renova a reserva alheia (nem sabe que existe)',
    pg_temp.err(format('select public.request_pedagogical_renewal(%L, 5)', orig.id)) = 'reservation_not_found');

  perform pg_temp.as_user(P1);
  perform pg_temp.say('prazo 0 recusado', pg_temp.err(format('select public.request_pedagogical_renewal(%L, 0)', orig.id)) = 'invalid_days');
  perform pg_temp.say('prazo acima do limite de 30 dias recusado', pg_temp.err(format('select public.request_pedagogical_renewal(%L, 31)', orig.id)) = 'invalid_days');
  perform pg_temp.as_user(BIB);
  perform public.set_pedagogical_max_days(10);
  perform pg_temp.as_user(P1);
  perform pg_temp.say('o limite configurável vale: 11 dias com limite 10 é recusado',
    pg_temp.err(format('select public.request_pedagogical_renewal(%L, 11)', orig.id)) = 'invalid_days');
  perform pg_temp.say('reserva que não existe', pg_temp.err(format('select public.request_pedagogical_renewal(%L, 5)', gen_random_uuid())) = 'reservation_not_found');

  ---------------------------------------------------------------- PEDIR
  r1 := public.request_pedagogical_renewal(orig.id, 7, k);
  perform pg_temp.say('pedido entra pendente, ligado à original', r1.status = 'pending' and r1.renewal_of = orig.id and r1.teacher_id = P1::uuid);
  perform pg_temp.say('o novo período começa no fim do atual e dura os dias pedidos', r1.start_date = today + 5 and r1.days = 7);
  perform pg_temp.say('a disciplina é a da original', r1.purpose = 'Disciplina X');
  perform pg_temp.say('mesma chave de idempotência: o mesmo pedido', (public.request_pedagogical_renewal(orig.id, 7, k)).id = r1.id);
  perform pg_temp.as_admin();
  select count(*) into n from public.pedagogical_reservations where renewal_of = orig.id;
  perform pg_temp.say('só uma linha de renovação existe', n = 1);
  perform pg_temp.say('a renovação não tem livros próprios (o exemplar guardado é o da original)',
    not exists (select 1 from public.pedagogical_reservation_books where reservation_id = r1.id));
  perform pg_temp.say('auditoria registra o pedido com o id da original, só ids',
    exists (select 1 from public.audit_logs where action = 'pedagogical_requested' and entity_id = r1.id and details ->> 'renewal_of_id' = orig.id::text));
  perform pg_temp.say('índice único parcial: segunda pendente direto na tabela é recusada',
    pg_temp.err(format('insert into public.pedagogical_reservations (teacher_id, start_date, days, renewal_of) values (%L, current_date, 3, %L)', P1, orig.id)) like '%pedagogical_one_pending_renewal%');
  perform pg_temp.as_user(P1);
  perform pg_temp.say('só uma renovação pendente por reserva',
    pg_temp.err(format('select public.request_pedagogical_renewal(%L, 3)', orig.id)) = 'renewal_already_pending');
  perform pg_temp.say('renovação de renovação não existe', pg_temp.err(format('select public.request_pedagogical_renewal(%L, 3)', r1.id)) = 'renewal_of_renewal');
  select count(*) into n from public.pedagogical_reservations;
  perform pg_temp.say('RLS: o professor vê a original e a renovação (2 linhas, só as dele)', n = 2);
  perform pg_temp.as_user(P2);
  select count(*) into n from public.pedagogical_reservations;
  perform pg_temp.say('RLS: outro professor não vê nada', n = 0);
  perform pg_temp.as_user(P1);
  perform pg_temp.say('professor NÃO grava a renovação direto na tabela', pg_temp.err(format('insert into public.pedagogical_reservations (teacher_id, start_date, days, renewal_of) values (%L, current_date, 3, %L)', P1, orig.id)) like '%row-level security%');

  ---------------------------------------------------------------- EXEMPLAR GUARDADO NÃO DUPLICA
  perform pg_temp.as_user(BIB);
  perform pg_temp.say('com o pedido pendente, A continua com 1 exemplar fora da estante',
    (select open_loans from public.book_availability() where book_id = la) = 1);

  ---------------------------------------------------------------- DECIDIR: RECUSAR
  perform pg_temp.as_user(P1);
  perform pg_temp.say('professor NÃO decide', pg_temp.err(format('select public.decide_pedagogical_reservation(%L, true)', r1.id)) = 'forbidden');
  perform pg_temp.as_user(BIB);
  perform pg_temp.say('recusa sem justificativa é recusada', pg_temp.err(format('select public.decide_pedagogical_reservation(%L, false)', r1.id)) = 'note_required');
  x := public.decide_pedagogical_reservation(r1.id, false, 'Não há mais necessidade na aula');
  perform pg_temp.say('recusa com justificativa', x.status = 'rejected' and x.decision_note is not null);
  perform pg_temp.as_admin();
  perform pg_temp.say('recusar não muda a original', (select days from public.pedagogical_reservations where id = orig.id) = 10);
  perform pg_temp.say('auditoria da recusa traz a original', exists (select 1 from public.audit_logs where action = 'pedagogical_rejected' and entity_id = r1.id and details ->> 'renewal_of_id' = orig.id::text));

  ---------------------------------------------------------------- DECIDIR: APROVAR
  perform pg_temp.as_user(P1);
  r2 := public.request_pedagogical_renewal(orig.id, 7);
  perform pg_temp.say('depois da recusa pode pedir de novo', r2.status = 'pending');
  perform pg_temp.as_user(BIB);
  -- A tem só 1 exemplar e ele está guardado para esta mesma reserva: aprovar a renovação não pede exemplar livre.
  x := public.decide_pedagogical_reservation(r2.id, true, null, gen_random_uuid());
  perform pg_temp.say('aprovar a renovação NÃO exige exemplar livre', x.status = 'approved');
  perform pg_temp.as_admin();
  select * into orig from public.pedagogical_reservations where id = orig.id;
  perform pg_temp.say('a original ganha os dias: fim avança de +5 para +12', orig.days = 17 and orig.start_date + orig.days = today + 12);
  perform pg_temp.say('a original continua aprovada', orig.status = 'approved');
  perform pg_temp.as_user(BIB);
  perform pg_temp.say('depois de aprovada, A continua com 1 exemplar guardado (não duplica)',
    (select open_loans from public.book_availability() where book_id = la) = 1 and (select open_loans from public.book_availability() where book_id = lb) = 1);
  perform pg_temp.say('o empréstimo comum continua sem levar o exemplar guardado',
    pg_temp.err(format('select public.create_loan(%L, %L)', la, ALUNO)) = 'no_copy_available');
  perform pg_temp.say('decidir de novo a mesma decisão devolve o mesmo resultado', (public.decide_pedagogical_reservation(r2.id, true)).status = 'approved');
  perform pg_temp.say('decisão contrária depois de decidida é recusada', pg_temp.err(format('select public.decide_pedagogical_reservation(%L, false, %L)', r2.id, 'x')) = 'already_decided');

  ---------------------------------------------------------------- JANELA JÁ VENCIDA E TETO DE 365
  -- O fim passou há 3 dias e o professor ainda não devolveu: o novo período começa hoje, sem "buraco".
  perform pg_temp.as_admin();
  update public.pedagogical_reservations set start_date = today - 20 where id = orig.id;  -- fim = -20 + 17 = -3
  perform pg_temp.as_user(P1);
  r3 := public.request_pedagogical_renewal(orig.id, 5);
  perform pg_temp.say('com o fim vencido o novo período começa hoje', r3.start_date = today and r3.days = 5);
  perform pg_temp.as_user(BIB);
  perform public.decide_pedagogical_reservation(r3.id, true);
  perform pg_temp.as_admin();
  perform pg_temp.say('a original cobre o período todo até o novo fim (hoje + 5)',
    (select start_date + days from public.pedagogical_reservations where id = orig.id) = today + 5);
  perform pg_temp.as_user(BIB);
  perform pg_temp.say('devolver uma renovação aprovada direto é recusado (devolve-se a reserva original)',
    pg_temp.err(format('select public.return_pedagogical_reservation(%L)', r3.id)) = 'reservation_not_approved');
  perform public.set_pedagogical_max_days(365);
  perform pg_temp.as_user(P1);
  perform pg_temp.say('o período total nunca passa de 365 dias', pg_temp.err(format('select public.request_pedagogical_renewal(%L, 365)', orig.id)) = 'renewal_too_long');
  perform pg_temp.as_user(BIB);
  perform public.set_pedagogical_max_days(30);

  ---------------------------------------------------------------- DEVOLVER ENCERRA AS RENOVAÇÕES
  perform pg_temp.as_user(P1);
  r1 := public.request_pedagogical_renewal(orig.id, 3);   -- fica pendente
  perform pg_temp.as_user(BIB);
  x := public.return_pedagogical_reservation(orig.id, gen_random_uuid());
  perform pg_temp.say('devolução da original', x.status = 'returned');
  perform pg_temp.as_admin();
  perform pg_temp.say('renovações aprovadas viram devolvidas', (select count(*) from public.pedagogical_reservations where renewal_of = orig.id and status = 'approved') = 0
    and (select count(*) from public.pedagogical_reservations where renewal_of = orig.id and status = 'returned') = 2);
  perform pg_temp.say('a renovação pendente é cancelada', (select status from public.pedagogical_reservations where id = r1.id) = 'cancelled');
  perform pg_temp.as_user(BIB);
  perform pg_temp.say('os exemplares voltaram para a estante', (select open_loans from public.book_availability() where book_id = la) = 0);
  perform pg_temp.as_user(P1);
  perform pg_temp.say('reserva devolvida não renova', pg_temp.err(format('select public.request_pedagogical_renewal(%L, 3)', orig.id)) = 'reservation_not_approved');
  perform pg_temp.as_admin();
  perform pg_temp.say('auditoria: toda renovação guarda só ids (a restrição do banco a impõe)',
    not exists (select 1 from public.audit_logs where entity = 'pedagogical_reservations' and not public.audit_details_are_ids(details)));
  perform pg_temp.say('funções novas não são executáveis sem login', not has_function_privilege('anon', 'public.request_pedagogical_renewal(uuid,integer,uuid)', 'execute'));
  perform pg_temp.say('a janela é interna', not has_function_privilege('authenticated', 'public.renewal_window_days()', 'execute'));
end $$;
