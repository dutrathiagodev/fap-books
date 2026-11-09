-- Testes do fluxo da reserva pedagógica (cards 0090, 0091, 0092; histórias 0048 a 0054).
-- Rode num Postgres de teste, em banco novo, depois de aplicar TODAS as migrations (inclui 20261108180000):
-- veja docs/database/modelo-de-dados.md. Cada linha mostra PASS ou FAIL.

insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-0000000000a1','prof1@x.com','{"full_name":"Paulo Professor"}'),
 ('00000000-0000-0000-0000-0000000000a2','prof2@x.com','{"full_name":"Priscila Professora"}'),
 ('00000000-0000-0000-0000-0000000000a3','aluno@x.com','{"full_name":"Ana Aluna"}'),
 ('00000000-0000-0000-0000-0000000000a4','bib@x.com','{"full_name":"Dora Bibliotecária"}'),
 ('00000000-0000-0000-0000-0000000000a5','aluno2@x.com','{"full_name":"Bia Aluna"}'),
 ('00000000-0000-0000-0000-0000000000a6','profx@x.com','{"full_name":"Pedro Inativo"}');
update public.profiles set role = 'teacher' where id in
  ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a2','00000000-0000-0000-0000-0000000000a6');
update public.profiles set role = 'librarian', job_title = 'Auxiliar' where id = '00000000-0000-0000-0000-0000000000a4';
update public.profiles set active = false where id = '00000000-0000-0000-0000-0000000000a6';

create function pg_temp.as_user(u text) returns void language plpgsql as $$
begin perform set_config('role','authenticated',true); perform set_config('request.jwt.claim.sub',u,true); end $$;
create function pg_temp.as_anon() returns void language plpgsql as $$
begin perform set_config('role','anon',true); perform set_config('request.jwt.claim.sub','',true); end $$;
create function pg_temp.say(n text, ok boolean) returns void language plpgsql as $$
begin raise notice '% %', case when ok then 'PASS ' else 'FAIL ' end, n; end $$;
create function pg_temp.err(cmd text) returns text language plpgsql as $$
begin execute cmd; return 'ok'; exception when others then return sqlerrm; end $$;

insert into public.books (id, title, author, code, quantity, status) values
 ('b0000000-0000-0000-0000-0000000000f1','Livro A','Autor','P-001',1,'active'),
 ('b0000000-0000-0000-0000-0000000000f2','Livro B','Autor','P-002',2,'active'),
 ('b0000000-0000-0000-0000-0000000000f3','Livro C','Autor','P-003',1,'active'),
 ('b0000000-0000-0000-0000-0000000000f4','Livro Inativo','Autor','P-004',1,'inactive');

do $$
declare
  P1 text:='00000000-0000-0000-0000-0000000000a1'; P2 text:='00000000-0000-0000-0000-0000000000a2';
  ALUNO text:='00000000-0000-0000-0000-0000000000a3'; BIB text:='00000000-0000-0000-0000-0000000000a4';
  ALUNO2 text:='00000000-0000-0000-0000-0000000000a5'; PX text:='00000000-0000-0000-0000-0000000000a6';
  fa uuid:='b0000000-0000-0000-0000-0000000000f1'; fb uuid:='b0000000-0000-0000-0000-0000000000f2';
  fc uuid:='b0000000-0000-0000-0000-0000000000f3'; fi uuid:='b0000000-0000-0000-0000-0000000000f4';
  today date := (now() at time zone 'America/Sao_Paulo')::date;
  r public.pedagogical_reservations; r2 public.pedagogical_reservations; r3 public.pedagogical_reservations;
  k uuid := gen_random_uuid(); n int; av record;
begin
  ---------------------------------------------------------------- SOLICITAÇÃO ONLINE (0048, 0050)
  perform pg_temp.as_anon();
  perform pg_temp.say('anônimo NÃO executa request_pedagogical_reservation',
    pg_temp.err(format('select public.request_pedagogical_reservation(array[%L]::uuid[], %L, 10)', fa, today)) like 'permission denied%');
  perform pg_temp.as_user(ALUNO);
  perform pg_temp.say('aluno NÃO solicita reserva pedagógica',
    pg_temp.err(format('select public.request_pedagogical_reservation(array[%L]::uuid[], %L, 10)', fa, today)) = 'forbidden');
  perform pg_temp.as_user(PX);
  perform pg_temp.say('professor inativo NÃO solicita',
    pg_temp.err(format('select public.request_pedagogical_reservation(array[%L]::uuid[], %L, 10)', fa, today)) = 'forbidden');
  perform pg_temp.as_user(BIB);
  perform pg_temp.say('funcionária NÃO usa a solicitação online (é do professor)',
    pg_temp.err(format('select public.request_pedagogical_reservation(array[%L]::uuid[], %L, 10)', fa, today)) = 'forbidden');

  perform pg_temp.as_user(P1);
  perform pg_temp.say('prazo 0 recusado', pg_temp.err(format('select public.request_pedagogical_reservation(array[%L]::uuid[], %L, 0)', fa, today)) = 'invalid_days');
  perform pg_temp.say('prazo 31 recusado', pg_temp.err(format('select public.request_pedagogical_reservation(array[%L]::uuid[], %L, 31)', fa, today)) = 'invalid_days');
  perform pg_temp.say('sem livro recusado', pg_temp.err(format('select public.request_pedagogical_reservation(array[]::uuid[], %L, 10)', today)) = 'books_required');
  perform pg_temp.say('livro repetido recusado', pg_temp.err(format('select public.request_pedagogical_reservation(array[%L,%L]::uuid[], %L, 10)', fa, fa, today)) = 'duplicate_books');
  perform pg_temp.say('livro inativo recusado', pg_temp.err(format('select public.request_pedagogical_reservation(array[%L]::uuid[], %L, 10)', fi, today)) = 'book_inactive');
  perform pg_temp.say('livro inexistente recusado', pg_temp.err(format('select public.request_pedagogical_reservation(array[gen_random_uuid()]::uuid[], %L, 10)', today)) = 'book_not_found');
  perform pg_temp.say('data no passado recusada', pg_temp.err(format('select public.request_pedagogical_reservation(array[%L]::uuid[], %L, 10)', fa, today - 1)) = 'start_in_past');
  perform pg_temp.say('data a mais de 1 ano recusada', pg_temp.err(format('select public.request_pedagogical_reservation(array[%L]::uuid[], %L, 10)', fa, today + 400)) = 'start_too_far');
  perform pg_temp.say('mais de 10 livros recusado',
    pg_temp.err(format('select public.request_pedagogical_reservation((select array_agg(gen_random_uuid()) from generate_series(1,11)), %L, 10)', today)) = 'too_many_books');
  perform pg_temp.say('disciplina com mais de 120 letras recusada',
    pg_temp.err(format('select public.request_pedagogical_reservation(array[%L]::uuid[], %L, 10, %L)', fa, today, repeat('x', 121))) in ('purpose_too_long', 'new row for relation "pedagogical_reservations" violates check constraint "pedagogical_reservations_purpose_check"'));
  perform set_config('role','postgres',true);
  perform pg_temp.say('nenhum pedido ficou gravado depois dos erros', (select count(*) from public.pedagogical_reservations) = 0);

  perform pg_temp.as_user(P1);
  r := public.request_pedagogical_reservation(array[fa, fb], today + 5, 30, '  Redes I  ', k);
  perform pg_temp.say('pedido válido nasce pendente, do professor, online', r.status = 'pending' and r.teacher_id = P1::uuid and not r.requested_in_person);
  perform pg_temp.say('guarda disciplina sem espaços, prazo e quem criou', r.purpose = 'Redes I' and r.days = 30 and r.created_by = P1::uuid);
  perform pg_temp.say('guarda os 2 livros', (select count(*) from public.pedagogical_reservation_books where reservation_id = r.id) = 2);
  r2 := public.request_pedagogical_reservation(array[fa, fb], today + 5, 30, 'Redes I', k);
  perform pg_temp.say('mesma chave de idempotência devolve o mesmo pedido', r2.id = r.id);
  perform set_config('role','postgres',true);
  perform pg_temp.say('chave repetida não duplica o pedido', (select count(*) from public.pedagogical_reservations) = 1);
  perform pg_temp.say('auditoria pedagogical_requested só com ids',
    (select count(*) from public.audit_logs where action = 'pedagogical_requested' and entity_id = r.id and actor_id = P1::uuid
       and details = jsonb_build_object('reservation_id', r.id, 'teacher_id', r.teacher_id)) = 1);
  perform pg_temp.as_user(P1);
  perform pg_temp.say('mesma chave em outra ação é recusada',
    pg_temp.err(format('select public.register_in_person_pedagogical_reservation(%L, array[%L]::uuid[], %L, 5, null, %L)', P1, fa, today, k)) in ('forbidden', 'idempotency_key_reused'));

  -- escrita direta nas tabelas foi fechada: o professor não pula as regras
  perform pg_temp.say('professor NÃO insere direto na tabela de reservas',
    pg_temp.err(format('insert into public.pedagogical_reservations (teacher_id, start_date, days) values (%L, %L, 5)', P1, today)) like '%row-level security%');
  perform pg_temp.say('professor NÃO decide a própria reserva gravando direto',
    pg_temp.err(format('update public.pedagogical_reservations set status = %L where id = %L', 'approved', r.id)) = 'ok'
    and (select status from public.pedagogical_reservations where id = r.id) = 'pending');

  ---------------------------------------------------------------- LEITURA (RLS)
  select count(*) into n from public.pedagogical_reservations;
  perform pg_temp.say('professor vê as próprias solicitações (1)', n = 1);
  perform pg_temp.as_user(P2);
  select count(*) into n from public.pedagogical_reservations;
  perform pg_temp.say('outro professor NÃO vê as de terceiros', n = 0);
  perform pg_temp.as_user(ALUNO);
  select count(*) into n from public.pedagogical_reservations;
  perform pg_temp.say('aluno NÃO vê reservas pedagógicas', n = 0);
  perform pg_temp.as_user(BIB);
  select count(*) into n from public.pedagogical_reservations;
  perform pg_temp.say('funcionária vê todas', n = 1);

  ---------------------------------------------------------------- PRESENCIAL (0049)
  perform pg_temp.as_user(P1);
  perform pg_temp.say('professor NÃO usa o registro presencial',
    pg_temp.err(format('select public.register_in_person_pedagogical_reservation(%L, array[%L]::uuid[], %L, 5)', P1, fc, today)) = 'forbidden');
  perform pg_temp.as_user(BIB);
  perform pg_temp.say('presencial: professor inexistente recusado',
    pg_temp.err(format('select public.register_in_person_pedagogical_reservation(gen_random_uuid(), array[%L]::uuid[], %L, 5)', fc, today)) = 'teacher_not_found');
  perform pg_temp.say('presencial: aluno não é professor',
    pg_temp.err(format('select public.register_in_person_pedagogical_reservation(%L, array[%L]::uuid[], %L, 5)', ALUNO, fc, today)) = 'teacher_not_found');
  perform pg_temp.say('presencial: professor inativo recusado',
    pg_temp.err(format('select public.register_in_person_pedagogical_reservation(%L, array[%L]::uuid[], %L, 5)', PX, fc, today)) = 'teacher_not_found');
  perform pg_temp.say('presencial: prazo 45 recusado',
    pg_temp.err(format('select public.register_in_person_pedagogical_reservation(%L, array[%L]::uuid[], %L, 45)', P2, fc, today)) = 'invalid_days');
  r3 := public.register_in_person_pedagogical_reservation(P2::uuid, array[fc], today, 7, null);
  perform pg_temp.say('presencial: nasce pendente, em nome do professor, marcada como presencial',
    r3.status = 'pending' and r3.teacher_id = P2::uuid and r3.requested_in_person and r3.created_by = BIB::uuid);
  perform pg_temp.as_user(P2);
  perform pg_temp.say('o professor vê o pedido registrado no balcão em nome dele',
    (select count(*) from public.pedagogical_reservations where id = r3.id) = 1);

  ---------------------------------------------------------------- DECISÃO (0052)
  perform pg_temp.as_user(P1);
  perform pg_temp.say('professor NÃO aprova', pg_temp.err(format('select public.decide_pedagogical_reservation(%L, true)', r.id)) = 'forbidden');
  perform pg_temp.as_user(BIB);
  perform pg_temp.say('recusar sem justificativa é recusado', pg_temp.err(format('select public.decide_pedagogical_reservation(%L, false)', r.id)) = 'note_required');
  perform pg_temp.say('recusar com justificativa só de espaços é recusado', pg_temp.err(format('select public.decide_pedagogical_reservation(%L, false, %L)', r.id, '   ')) = 'note_required');
  perform pg_temp.say('justificativa de 501 letras é recusada', pg_temp.err(format('select public.decide_pedagogical_reservation(%L, false, %L)', r.id, repeat('x', 501))) = 'note_too_long');
  perform pg_temp.say('solicitação inexistente', pg_temp.err('select public.decide_pedagogical_reservation(gen_random_uuid(), true)') = 'reservation_not_found');
  perform pg_temp.say('decisão nula recusada', pg_temp.err(format('select public.decide_pedagogical_reservation(%L, null)', r.id)) = 'decision_required');

  r2 := public.decide_pedagogical_reservation(r3.id, false, 'Sem previsão de uso nesta data.');
  perform pg_temp.say('recusa grava status, justificativa, quem decidiu e quando',
    r2.status = 'rejected' and r2.decision_note = 'Sem previsão de uso nesta data.' and r2.decided_by = BIB::uuid and r2.decided_at is not null);
  perform pg_temp.say('recusar de novo (mesma decisão) não muda nada', (public.decide_pedagogical_reservation(r3.id, false, 'outra')).decision_note = 'Sem previsão de uso nesta data.');
  perform pg_temp.say('aprovar o que já foi recusado é erro', pg_temp.err(format('select public.decide_pedagogical_reservation(%L, true)', r3.id)) = 'already_decided');
  perform set_config('role','postgres',true);
  perform pg_temp.say('o livro da recusada NÃO fica guardado', public.pedagogical_held_copies(fc) = 0);
  perform pg_temp.as_user(BIB);

  k := gen_random_uuid();
  r2 := public.decide_pedagogical_reservation(r.id, true, null, k);
  perform pg_temp.say('aprovação grava status e quem decidiu', r2.status = 'approved' and r2.decided_by = BIB::uuid and r2.decided_at is not null);
  perform pg_temp.say('mesma chave devolve a mesma decisão', (public.decide_pedagogical_reservation(r.id, true, null, k)).decided_at = r2.decided_at);
  perform pg_temp.say('recusar o que já foi aprovado é erro', pg_temp.err(format('select public.decide_pedagogical_reservation(%L, false, %L)', r.id, 'x')) = 'already_decided');
  perform set_config('role','postgres',true);
  perform pg_temp.say('auditoria de decisão só com ids',
    (select count(*) from public.audit_logs where entity = 'pedagogical_reservations' and action in ('pedagogical_approved', 'pedagogical_rejected')
       and details ?& array['reservation_id', 'teacher_id'] and (select count(*) from jsonb_object_keys(details)) = 2) = 2);

  ---------------------------------------------------------------- CONCORRÊNCIA COM O EMPRÉSTIMO COMUM
  -- Livro A (1 exemplar) está guardado pela reserva aprovada; Livro B (2 exemplares) tem 1 guardado e 1 livre.
  perform pg_temp.as_user(BIB);
  perform pg_temp.say('empréstimo comum do livro guardado (A, 1 exemplar) é recusado', pg_temp.err(format('select public.create_loan(%L, %L)', fa, ALUNO)) = 'no_copy_available');
  perform pg_temp.say('empréstimo do livro B (2 exemplares, 1 guardado) vale uma vez', pg_temp.err(format('select public.create_loan(%L, %L)', fb, ALUNO)) = 'ok');
  perform pg_temp.say('o segundo exemplar de B está guardado: outro empréstimo é recusado', pg_temp.err(format('select public.create_loan(%L, %L)', fb, ALUNO2)) = 'no_copy_available');
  perform pg_temp.say('a quantidade de B não pode cair abaixo de empréstimos + guardados',
    pg_temp.err(format('update public.books set quantity = 1 where id = %L', fb)) like '%quantity_below_open_loans%');

  perform pg_temp.as_user(ALUNO2);
  select * into av from public.book_availability() where book_id = fa;
  perform pg_temp.say('pesquisa: livro A aparece sem exemplar na estante (open_loans = 1)', av.open_loans = 1);
  perform pg_temp.say('pesquisa: data de volta = fim do período da reserva (início + 30 dias)',
    (av.next_due_at at time zone 'America/Sao_Paulo')::date = today + 5 + 30);
  perform pg_temp.say('aluno consegue reservar o livro A (sem exemplar livre na estante)',
    pg_temp.err(format('select public.reserve_book(%L)', fa)) = 'ok');

  -- aprovar exige exemplar livre: A está guardado, então uma 2ª reserva de A não é aprovada
  perform pg_temp.as_user(P2);
  r3 := public.request_pedagogical_reservation(array[fa], today + 1, 5);
  perform pg_temp.as_user(BIB);
  perform pg_temp.say('aprovar livro sem exemplar livre é recusado (conflito de disponibilidade)',
    pg_temp.err(format('select public.decide_pedagogical_reservation(%L, true)', r3.id)) = 'no_copy_available');
  perform set_config('role','postgres',true);
  perform pg_temp.say('a aprovação recusada por conflito não mudou o pedido', (select status from public.pedagogical_reservations where id = r3.id) = 'pending');

  ---------------------------------------------------------------- DEVOLUÇÃO (0054)
  perform pg_temp.as_user(P1);
  perform pg_temp.say('professor NÃO registra a devolução', pg_temp.err(format('select public.return_pedagogical_reservation(%L)', r.id)) = 'forbidden');
  perform pg_temp.as_user(BIB);
  perform pg_temp.say('pendente não pode ser devolvida', pg_temp.err(format('select public.return_pedagogical_reservation(%L)', r3.id)) = 'reservation_not_approved');
  perform pg_temp.say('devolução de solicitação inexistente', pg_temp.err('select public.return_pedagogical_reservation(gen_random_uuid())') = 'reservation_not_found');
  k := gen_random_uuid();
  r2 := public.return_pedagogical_reservation(r.id, k);
  perform pg_temp.say('devolução grava status, quem e quando', r2.status = 'returned' and r2.returned_by = BIB::uuid and r2.returned_at is not null);
  perform pg_temp.say('devolver de novo não muda nada', (public.return_pedagogical_reservation(r.id)).returned_at = r2.returned_at);
  perform pg_temp.say('mesma chave devolve o mesmo resultado', (public.return_pedagogical_reservation(r.id, k)).returned_at = r2.returned_at);
  perform set_config('role','postgres',true);
  perform pg_temp.say('auditoria pedagogical_returned gravada', (select count(*) from public.audit_logs where action = 'pedagogical_returned' and entity_id = r.id) = 1);
  perform pg_temp.say('devolvida não guarda mais exemplar', public.pedagogical_held_copies(fa) = 0 and public.pedagogical_held_copies(fb) = 0);
  perform pg_temp.say('a reserva do aluno no livro A foi promovida a "pronta" ao liberar o exemplar',
    (select status from public.reservations where book_id = fa and user_id = ALUNO2::uuid) = 'ready');

  perform pg_temp.as_user(BIB);
  perform pg_temp.say('com o exemplar guardado para o aluno, outra pessoa não leva o livro A',
    pg_temp.err(format('select public.create_loan(%L, %L)', fa, ALUNO)) in ('copy_reserved_for_others', 'no_copy_available'));
  perform pg_temp.say('o segundo exemplar de B voltou: empréstimo vale', pg_temp.err(format('select public.create_loan(%L, %L)', fb, ALUNO2)) = 'ok');
  r3 := public.decide_pedagogical_reservation(r3.id, false, 'Livro reservado por aluno.');
  perform pg_temp.say('a recusa não depende de exemplar livre', r3.status = 'rejected');

  ---------------------------------------------------------------- RECUSADA NÃO GUARDA E REGRAS DE LINHA
  perform pg_temp.say('recusada sem justificativa não existe nem gravando direto',
    pg_temp.err(format('update public.pedagogical_reservations set status = %L, decision_note = null where id = %L', 'rejected', r.id)) like '%pedagogical_rejection_has_note%');
  perform pg_temp.say('devolvida sem data de devolução não existe',
    pg_temp.err(format('update public.pedagogical_reservations set returned_at = null where id = %L', r.id)) like '%pedagogical_returned_has_date%');
end $$;
