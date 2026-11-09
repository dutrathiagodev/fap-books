-- Testes da edição e da inativação de usuários pela funcionária (cards 0088, 0127 e 0128).
-- Rode num Postgres de teste, em banco novo, depois de aplicar TODAS as migrations (inclui 20261108200000):
-- veja docs/database/modelo-de-dados.md. Cada linha mostra PASS ou FAIL.

insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-0000000000f1','ana@x.com','{"full_name":"Ana Aluna"}'),
 ('00000000-0000-0000-0000-0000000000f2','bia@x.com','{"full_name":"Bia Aluna"}'),
 ('00000000-0000-0000-0000-0000000000f3','dora@x.com','{"full_name":"Dora Bibliotecária"}'),
 ('00000000-0000-0000-0000-0000000000f4','eva@x.com','{"full_name":"Eva Bibliotecária"}'),
 ('00000000-0000-0000-0000-0000000000f5','paulo@x.com','{"full_name":"Paulo Professor"}');
update public.profiles set role = 'librarian', job_title = 'Auxiliar' where id in
  ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-0000000000f4');
update public.profiles set role = 'teacher' where id = '00000000-0000-0000-0000-0000000000f5';
update public.profiles set registration = '100001', course = 'ADS' where id = '00000000-0000-0000-0000-0000000000f1';
update public.profiles set registration = '100002', course = 'ADS' where id = '00000000-0000-0000-0000-0000000000f2';

create function pg_temp.as_user(u text) returns void language plpgsql as $$
begin perform set_config('role','authenticated',true); perform set_config('request.jwt.claim.sub',u,true); end $$;
create function pg_temp.as_anon() returns void language plpgsql as $$
begin perform set_config('role','anon',true); perform set_config('request.jwt.claim.sub','',true); end $$;
create function pg_temp.say(n text, ok boolean) returns void language plpgsql as $$
begin raise notice '% %', case when ok then 'PASS ' else 'FAIL ' end, n; end $$;
create function pg_temp.err(cmd text) returns text language plpgsql as $$
begin execute cmd; return 'ok'; exception when others then return sqlerrm; end $$;

insert into public.books (id, title, author, code, quantity) values
 ('b0000000-0000-0000-0000-0000000000f1','Livro 1','Autor','U-001',1),
 ('b0000000-0000-0000-0000-0000000000f2','Livro 2','Autor','U-002',1);

do $$
declare
  ANA text:='00000000-0000-0000-0000-0000000000f1'; BIA text:='00000000-0000-0000-0000-0000000000f2';
  DORA text:='00000000-0000-0000-0000-0000000000f3'; EVA text:='00000000-0000-0000-0000-0000000000f4';
  PAULO text:='00000000-0000-0000-0000-0000000000f5';
  b1 uuid:='b0000000-0000-0000-0000-0000000000f1'; b2 uuid:='b0000000-0000-0000-0000-0000000000f2';
  p public.profiles; p2 public.profiles; k uuid := gen_random_uuid(); k2 uuid := gen_random_uuid(); n int; v_loan public.loans;
  r1 uuid; r2 uuid;
begin
  ---------------------------------------------------------------- PERMISSÃO
  perform pg_temp.as_anon();
  perform pg_temp.say('anônimo NÃO executa update_profile_admin',
    pg_temp.err(format('select public.update_profile_admin(%L, ''X Y Z'', null, null, null, null, ''teacher'', false)', PAULO)) like 'permission denied%');
  perform pg_temp.say('anônimo NÃO executa set_profile_active',
    pg_temp.err(format('select public.set_profile_active(%L, false)', ANA)) like 'permission denied%');
  perform pg_temp.as_user(ANA);
  perform pg_temp.say('aluno NÃO edita outro perfil (forbidden)',
    pg_temp.err(format('select public.update_profile_admin(%L, ''Paulo Prof'', null, null, null, null, ''teacher'', false)', PAULO)) = 'forbidden');
  perform pg_temp.say('aluno NÃO edita nem o próprio perfil (forbidden)',
    pg_temp.err(format('select public.update_profile_admin(%L, ''Ana Aluna'', null, ''100001'', ''ADS'', null, ''student'', false)', ANA)) = 'forbidden');
  perform pg_temp.say('aluno NÃO inativa (forbidden)', pg_temp.err(format('select public.set_profile_active(%L, false)', BIA)) = 'forbidden');
  perform set_config('role','postgres',true);
  perform pg_temp.say('nada mudou depois das tentativas do aluno',
    (select active and full_name = 'Bia Aluna' from public.profiles where id = BIA::uuid));

  ---------------------------------------------------------------- EDIÇÃO
  perform pg_temp.as_user(DORA);
  perform pg_temp.say('telefone com máscara é recusado (só números)',
    pg_temp.err(format('select public.update_profile_admin(%L, ''Paulo Souza'', ''(41) 98888-7777'', null, null, null, ''teacher'', false)', PAULO)) = 'invalid_phone');
  perform pg_temp.as_user(DORA);
  p := public.update_profile_admin(PAULO::uuid, '  Paulo Souza  ', '41988887777', '12345', 'ADS', 'Chefe', 'teacher', true, k);
  perform pg_temp.say('edita nome (sem espaços nas pontas) e telefone', p.full_name = 'Paulo Souza' and p.phone = '41988887777');
  perform pg_temp.say('professor: matrícula, curso e cargo ficam nulos', p.registration is null and p.course is null and p.job_title is null);
  perform pg_temp.say('professor nunca é formando', p.graduating = false);
  perform pg_temp.say('e-mail e situação não mudam na edição', p.email = 'paulo@x.com' and p.active);
  perform set_config('role','postgres',true);
  perform pg_temp.say('auditoria profile_updated só com ids',
    (select count(*) from public.audit_logs where action = 'profile_updated' and entity_id = PAULO::uuid and actor_id = DORA::uuid
       and details = jsonb_build_object('profile_id', PAULO::uuid)) = 1);

  perform pg_temp.as_user(DORA);
  p2 := public.update_profile_admin(PAULO::uuid, 'Outro Nome', null, null, null, null, 'teacher', false, k);
  perform pg_temp.say('mesma chave de idempotência: devolve o resultado guardado e não regrava', p2.full_name = 'Paulo Souza');
  perform pg_temp.say('mesma chave em outra ação é recusada',
    pg_temp.err(format('select public.set_profile_active(%L, false, false, %L)', ANA, k)) = 'idempotency_key_reused');
  perform set_config('role','postgres',true);
  perform pg_temp.say('reenvio não duplica a auditoria',
    (select count(*) from public.audit_logs where action = 'profile_updated' and entity_id = PAULO::uuid) = 1);

  -- aluno: matrícula, curso e formando
  perform pg_temp.as_user(DORA);
  p := public.update_profile_admin(ANA::uuid, 'Ana Aluna', '4133334444', '100001', 'Redes', null, 'student', true);
  perform pg_temp.say('aluno formando grava curso e formando', p.course = 'Redes' and p.graduating and p.phone = '4133334444');
  perform set_config('role','postgres',true);
  perform pg_temp.say('formando passa a ter limite de 4 livros', public.loan_limit_for(p.graduating) = 4);
  perform pg_temp.as_user(DORA);

  perform pg_temp.say('aluno sem matrícula é recusado', pg_temp.err(format('select public.update_profile_admin(%L, ''Ana Aluna'', null, null, ''ADS'', null, ''student'', false)', ANA)) = 'invalid_registration');
  perform pg_temp.say('matrícula fora do formato é recusada', pg_temp.err(format('select public.update_profile_admin(%L, ''Ana Aluna'', null, ''12ab'', ''ADS'', null, ''student'', false)', ANA)) = 'invalid_registration');
  perform pg_temp.say('aluno sem curso é recusado', pg_temp.err(format('select public.update_profile_admin(%L, ''Ana Aluna'', null, ''100001'', null, null, ''student'', false)', ANA)) = 'invalid_course');
  perform pg_temp.say('matrícula de outra pessoa é recusada (registration_taken)',
    pg_temp.err(format('select public.update_profile_admin(%L, ''Ana Aluna'', null, ''100002'', ''ADS'', null, ''student'', false)', ANA)) = 'registration_taken');
  perform pg_temp.say('nome curto é recusado', pg_temp.err(format('select public.update_profile_admin(%L, ''Al'', null, ''100001'', ''ADS'', null, ''student'', false)', ANA)) = 'invalid_name');
  perform pg_temp.say('perfil nulo é recusado', pg_temp.err(format('select public.update_profile_admin(%L, ''Ana Aluna'', null, ''100001'', ''ADS'', null, null, false)', ANA)) = 'invalid_role');
  perform pg_temp.say('usuário inexistente', pg_temp.err('select public.update_profile_admin(gen_random_uuid(), ''Ana Aluna'', null, ''100001'', ''ADS'', null, ''student'', false)') = 'profile_not_found');
  perform pg_temp.say('funcionário sem cargo é recusado', pg_temp.err(format('select public.update_profile_admin(%L, ''Eva Bibliotecária'', null, null, null, null, ''librarian'', false)', EVA)) = 'job_title_required');

  -- mudança de perfil
  p := public.update_profile_admin(BIA::uuid, 'Bia Aluna', null, null, null, null, 'teacher', true);
  perform pg_temp.say('aluno vira professor: matrícula e curso somem, formando zera',
    p.role = 'teacher' and p.registration is null and p.course is null and not p.graduating);
  p := public.update_profile_admin(BIA::uuid, 'Bia Aluna', null, '100002', 'ADS', null, 'student', false);
  perform pg_temp.say('professor volta a ser aluno com matrícula e curso', p.role = 'student' and p.registration = '100002');
  p := public.update_profile_admin(EVA::uuid, 'Eva Bibliotecária', null, null, null, 'Chefe', 'librarian', false);
  perform pg_temp.say('outra funcionária pode ter o cargo editado', p.job_title = 'Chefe');

  -- a funcionária não muda o próprio perfil
  perform pg_temp.say('NÃO muda o próprio perfil (cannot_change_own_role)',
    pg_temp.err(format('select public.update_profile_admin(%L, ''Dora Bibliotecária'', null, ''100009'', ''ADS'', null, ''student'', false)', DORA)) = 'cannot_change_own_role');
  p := public.update_profile_admin(DORA::uuid, 'Dora Bibliotecária', '41999990000', null, null, 'Auxiliar sênior', 'librarian', false);
  perform pg_temp.say('mas edita os próprios dados (nome, telefone, cargo)', p.role = 'librarian' and p.job_title = 'Auxiliar sênior');

  ---------------------------------------------------------------- INATIVAÇÃO
  perform pg_temp.say('NÃO inativa a si mesma (cannot_change_own_status)', pg_temp.err(format('select public.set_profile_active(%L, false)', DORA)) = 'cannot_change_own_status');
  perform pg_temp.say('usuário inexistente na inativação', pg_temp.err('select public.set_profile_active(gen_random_uuid(), false)') = 'profile_not_found');

  -- Ana (formando, 4 livros) com empréstimo aberto e uma reserva; Bia na fila do mesmo livro
  v_loan := public.create_loan(b1, ANA::uuid);
  perform pg_temp.say('antes de inativar, a Ana pega um livro', v_loan.id is not null);
  perform public.create_loan(b2, EVA::uuid);   -- livro 2 emprestado: a Ana só consegue entrar na fila dele
  perform set_config('role','postgres',true);
  insert into public.reservations (book_id, user_id, status) values (b1, BIA::uuid, 'waiting');
  insert into public.reservations (book_id, user_id, status) values (b2, ANA::uuid, 'waiting');
  perform pg_temp.as_user(DORA);

  perform pg_temp.say('com empréstimo em aberto, inativar exige confirmação (has_open_loans)',
    pg_temp.err(format('select public.set_profile_active(%L, false)', ANA)) = 'has_open_loans');
  perform set_config('role','postgres',true);
  perform pg_temp.say('sem confirmação nada muda', (select active from public.profiles where id = ANA::uuid)
    and (select count(*) from public.reservations where user_id = ANA::uuid and status = 'waiting') = 1);
  perform pg_temp.as_user(DORA);

  p := public.set_profile_active(ANA::uuid, false, true, k2);
  perform pg_temp.say('com confirmação, inativa', not p.active);
  perform set_config('role','postgres',true);
  perform pg_temp.say('auditoria profile_inactivated só com ids',
    (select count(*) from public.audit_logs where action = 'profile_inactivated' and entity_id = ANA::uuid and actor_id = DORA::uuid
       and details = jsonb_build_object('profile_id', ANA::uuid)) = 1);
  perform pg_temp.say('histórico fica: o empréstimo continua aberto, nada é apagado',
    (select count(*) from public.loans where user_id = ANA::uuid and returned_at is null) = 1);
  perform pg_temp.say('reserva da inativada é cancelada',
    (select status from public.reservations where user_id = ANA::uuid) = 'cancelled');
  perform pg_temp.say('auditoria da reserva cancelada só com ids',
    (select count(*) from public.audit_logs where action = 'reservation_cancelled' and details ->> 'user_id' = ANA and actor_id = DORA::uuid) = 1);
  perform pg_temp.say('quem estava na fila do mesmo livro segue esperando',
    (select status from public.reservations where user_id = BIA::uuid and book_id = b1) = 'waiting');

  perform pg_temp.as_user(DORA);
  p2 := public.set_profile_active(ANA::uuid, false, true, k2);
  perform pg_temp.say('mesma chave: devolve o resultado guardado', not p2.active);
  perform pg_temp.say('inativar de novo (sem chave) não faz nada', not (public.set_profile_active(ANA::uuid, false)).active);
  perform set_config('role','postgres',true);
  perform pg_temp.say('repetir não duplica a auditoria',
    (select count(*) from public.audit_logs where action = 'profile_inactivated' and entity_id = ANA::uuid) = 1);

  -- inativa não pega livro, nem renova, e perde o acesso de bibliotecária se for o caso
  perform pg_temp.as_user(DORA);
  perform pg_temp.say('inativo não pega livro (user_inactive)', pg_temp.err(format('select public.create_loan(%L, %L)', b2, ANA)) = 'user_inactive');
  -- a devolução segue funcionando no balcão
  v_loan := public.return_loan(v_loan.id);
  perform pg_temp.say('o livro do inativo ainda pode ser devolvido no balcão', v_loan.returned_at is not null);
  -- sem empréstimo aberto, inativa sem confirmação
  perform pg_temp.say('sem empréstimo aberto, inativa direto', not (public.set_profile_active(BIA::uuid, false)).active);

  -- inativa bibliotecária perde permissão
  perform pg_temp.say('funcionária com empréstimo também exige confirmação', pg_temp.err(format('select public.set_profile_active(%L, false)', EVA)) = 'has_open_loans');
  p := public.set_profile_active(EVA::uuid, false, true);
  perform pg_temp.as_user(EVA);
  perform pg_temp.say('funcionária inativada não executa mais as funções (forbidden)',
    pg_temp.err(format('select public.set_profile_active(%L, true)', BIA)) = 'forbidden');

  -- reativação
  perform pg_temp.as_user(DORA);
  p := public.set_profile_active(ANA::uuid, true);
  perform pg_temp.say('reativa', p.active);
  perform pg_temp.say('reativada pega livro de novo', pg_temp.err(format('select public.create_loan(%L, %L)', b1, ANA)) in ('ok', 'no_copy_available', 'copy_reserved_for_others'));
  perform set_config('role','postgres',true);
  perform pg_temp.say('auditoria profile_reactivated só com ids',
    (select count(*) from public.audit_logs where action = 'profile_reactivated' and entity_id = ANA::uuid
       and details = jsonb_build_object('profile_id', ANA::uuid)) = 1);
  perform pg_temp.say('nenhuma auditoria de perfil carrega nome, e-mail ou telefone',
    not exists (select 1 from public.audit_logs where entity = 'profiles' and action like 'profile_%' and details::text ~* '(@|full_name|phone|email)'));
end $$;
