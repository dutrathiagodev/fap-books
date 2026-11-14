-- Testes do aviso de prazo por e-mail (cards 0236, 0062 e 0064; RF-24).
-- Rode num Postgres de teste, em banco novo, depois de aplicar TODAS as migrations (inclui 20261113200000):
-- veja docs/database/modelo-de-dados.md. Cada linha mostra PASS ou FAIL. Nenhum e-mail é enviado: o envio é do servidor do app.

insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-0000000000a1','ana@x.com','{"full_name":"Ana Aluna"}'),
 ('00000000-0000-0000-0000-0000000000a2','bia@x.com','{"full_name":"Bia Aluna"}'),
 ('00000000-0000-0000-0000-0000000000a3','cris@x.com','{"full_name":"Cris Inativa"}'),
 ('00000000-0000-0000-0000-0000000000a4','dora@x.com','{"full_name":"Dora Bibliotecária"}');
update public.profiles set role = 'librarian', job_title = 'Auxiliar' where id = '00000000-0000-0000-0000-0000000000a4';
update public.profiles set email_notices = false where id = '00000000-0000-0000-0000-0000000000a2';  -- Bia não quer receber
update public.profiles set active = false where id = '00000000-0000-0000-0000-0000000000a3';

create function pg_temp.as_user(u text) returns void language plpgsql as $$
begin perform set_config('role','authenticated',true); perform set_config('request.jwt.claim.sub',u,true); end $$;
create function pg_temp.as_anon() returns void language plpgsql as $$
begin perform set_config('role','anon',true); perform set_config('request.jwt.claim.sub','',true); end $$;
create function pg_temp.as_service() returns void language plpgsql as $$
begin perform set_config('role','service_role',true); perform set_config('request.jwt.claim.sub','',true); end $$;
create function pg_temp.as_admin() returns void language plpgsql as $$
begin perform set_config('role','postgres',true); end $$;
create function pg_temp.say(n text, ok boolean) returns void language plpgsql as $$
begin raise notice '% %', case when ok then 'PASS ' else 'FAIL ' end, n; end $$;
create function pg_temp.err(cmd text) returns text language plpgsql as $$
begin execute cmd; return 'ok'; exception when others then return sqlerrm; end $$;

insert into public.books (id, title, author, code, quantity)
select ('b0000000-0000-0000-0000-0000000000' || lpad(i::text, 2, '0'))::uuid, 'Livro ' || i, 'Autor', 'AV-' || lpad(i::text, 3, '0'), 1
from generate_series(1, 12) i;

-- Os empréstimos de teste são gravados direto, sem as regras de limite e de reserva (o que se testa aqui é o aviso).
set session_replication_role = replica;

do $$
declare
  ANA uuid:='00000000-0000-0000-0000-0000000000a1'; BIA uuid:='00000000-0000-0000-0000-0000000000a2';
  CRIS uuid:='00000000-0000-0000-0000-0000000000a3'; DORA uuid:='00000000-0000-0000-0000-0000000000a4';
  -- Sexta, 13/11/2026, 12:00 em Brasília.
  agora timestamptz := '2026-11-13 12:00:00-03';
  a uuid; b uuid; c uuid; d uuid; e uuid; f uuid; g uuid; h uuid; i uuid;
  n int; r record; n_audit int; notice uuid;
  function_names text[];
begin
  -- Cada empréstimo é gravado direto (o teste não passa pela regra de limite); o prazo é o que define a situação.
  insert into public.loans (id, book_id, user_id, borrowed_at, due_at) values
    (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000001', ANA, '2026-11-08 10:00-03', '2026-11-15 18:00-03') returning id into a;       -- vence em 2 dias
  insert into public.loans (id, book_id, user_id, borrowed_at, due_at) values
    (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000002', ANA, '2026-11-07 10:00-03', '2026-11-14 18:00-03') returning id into b;       -- vence amanhã
  insert into public.loans (id, book_id, user_id, borrowed_at, due_at) values
    (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000003', ANA, '2026-11-06 10:00-03', '2026-11-13 23:59-03') returning id into c;       -- vence hoje (mesmo à noite)
  insert into public.loans (id, book_id, user_id, borrowed_at, due_at) values
    (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000004', ANA, '2026-11-09 10:00-03', '2026-11-16 18:00-03') returning id into d;       -- vence em 3 dias: ainda não
  insert into public.loans (id, book_id, user_id, borrowed_at, due_at) values
    (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000005', ANA, '2026-11-03 10:00-03', '2026-11-10 18:00-03') returning id into e;       -- atrasado
  insert into public.loans (id, book_id, user_id, borrowed_at, due_at, returned_at) values
    (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000006', ANA, '2026-11-06 10:00-03', '2026-11-13 18:00-03', '2026-11-12 10:00-03') returning id into f; -- já devolvido
  insert into public.loans (id, book_id, user_id, borrowed_at, due_at) values
    (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000007', BIA, '2026-11-06 10:00-03', '2026-11-13 18:00-03') returning id into g;       -- pessoa pediu para não receber
  insert into public.loans (id, book_id, user_id, borrowed_at, due_at) values
    (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000008', CRIS, '2026-11-06 10:00-03', '2026-11-13 18:00-03') returning id into h;      -- perfil inativo

  ---------------------------------------------------------------- PERMISSÃO
  perform pg_temp.as_anon();
  perform pg_temp.say('anônimo NÃO executa claim_loan_email_notices', pg_temp.err('select * from public.claim_loan_email_notices()') like 'permission denied%');
  perform pg_temp.as_user(ANA::text);
  perform pg_temp.say('aluno NÃO executa claim_loan_email_notices', pg_temp.err('select * from public.claim_loan_email_notices()') like 'permission denied%');
  perform pg_temp.say('aluno NÃO executa finish_loan_email_notice', pg_temp.err('select public.finish_loan_email_notice(gen_random_uuid(), true)') like 'permission denied%');
  perform pg_temp.as_user(DORA::text);
  perform pg_temp.say('nem a bibliotecária executa claim_loan_email_notices (só a chave secreta)', pg_temp.err('select * from public.claim_loan_email_notices()') like 'permission denied%');
  perform pg_temp.say('tabela de avisos fechada para a bibliotecária', pg_temp.err('select * from public.loan_email_notices') like 'permission denied%');
  perform pg_temp.as_anon();
  perform pg_temp.say('tabela de avisos fechada para o anônimo', pg_temp.err('select * from public.loan_email_notices') like 'permission denied%');

  ---------------------------------------------------------------- SELEÇÃO (simulação não grava)
  perform pg_temp.as_service();
  select count(*) into n from public.claim_loan_email_notices(50, 3, true, agora);
  perform pg_temp.say('simulação lista 4 avisos (2 a vencer, vence hoje, atrasado)', n = 4);
  perform pg_temp.as_admin();
  perform pg_temp.say('simulação não grava nada', (select count(*) from public.loan_email_notices) = 0);

  ---------------------------------------------------------------- SELEÇÃO REAL
  perform pg_temp.as_service();
  select count(*) into n from public.claim_loan_email_notices(50, 3, false, agora);
  perform pg_temp.say('1ª execução reserva 4 avisos', n = 4);
  perform pg_temp.as_admin();
  perform pg_temp.say('situação certa de cada empréstimo',
    (select kind from public.loan_email_notices where loan_id = a) = 'due_soon'
    and (select kind from public.loan_email_notices where loan_id = b) = 'due_soon'
    and (select kind from public.loan_email_notices where loan_id = c) = 'due_today'
    and (select kind from public.loan_email_notices where loan_id = e) = 'overdue');
  perform pg_temp.say('não avisa: vence em 3 dias, já devolvido, pediu para não receber, perfil inativo',
    not exists (select 1 from public.loan_email_notices where loan_id in (d, f, g, h)));

  -- IDEMPOTÊNCIA: rodar de novo (mesmo instante e meia hora depois) não duplica nem reenvia.
  perform pg_temp.as_service();
  select count(*) into n from public.claim_loan_email_notices(50, 3, false, agora);
  perform pg_temp.say('2ª execução logo depois não devolve nada', n = 0);
  select count(*) into n from public.claim_loan_email_notices(50, 3, false, agora + interval '30 minutes');
  perform pg_temp.say('execução meia hora depois também não (espera 1 hora entre tentativas)', n = 0);
  perform pg_temp.as_admin();
  perform pg_temp.say('continua com 4 registros, 1 tentativa cada', (select count(*) from public.loan_email_notices) = 4 and (select max(attempts) from public.loan_email_notices) = 1);

  ---------------------------------------------------------------- RESULTADO DO ENVIO
  select id into notice from public.loan_email_notices where loan_id = a;
  perform pg_temp.as_service();
  perform pg_temp.say('marcar enviado devolve true', public.finish_loan_email_notice(notice, true));
  perform pg_temp.say('marcar enviado de novo devolve false (não duplica a auditoria)', not public.finish_loan_email_notice(notice, true));
  perform pg_temp.as_admin();
  select count(*) into n_audit from public.audit_logs where action = 'loan_notice_sent' and entity_id = a;
  perform pg_temp.say('auditoria registra o envio uma vez, só com ids',
    n_audit = 1 and (select details ? 'loan_id' and details ? 'notice_id' and (select count(*) from jsonb_object_keys(details)) = 2
                     from public.audit_logs where action = 'loan_notice_sent' and entity_id = a));
  perform pg_temp.say('auditoria não guarda e-mail nem nome', not exists (
    select 1 from public.audit_logs where action = 'loan_notice_sent' and details::text ~* '(@|Ana|Livro)'));

  -- Falha de envio: b, c e e ficam sem sent_at e voltam depois de 1 hora; a (enviado) nunca volta.
  perform pg_temp.as_service();
  perform pg_temp.as_admin();
  select id into notice from public.loan_email_notices where loan_id = b;
  perform pg_temp.as_service();
  perform pg_temp.say('falha (p_sent = false) devolve false e não marca como enviado', not public.finish_loan_email_notice(notice, false));
  perform pg_temp.as_admin();
  perform pg_temp.say('aviso com falha continua sem sent_at', (select sent_at from public.loan_email_notices where id = notice) is null);
  perform pg_temp.as_service();
  select count(*) into n from public.claim_loan_email_notices(50, 3, false, agora + interval '2 hours');
  perform pg_temp.say('1 hora depois: tenta de novo só os 3 que falharam (o enviado não volta)', n = 3);
  select count(*) into n from public.claim_loan_email_notices(50, 3, false, agora + interval '4 hours');
  perform pg_temp.say('3ª tentativa ainda acontece', n = 3);
  select count(*) into n from public.claim_loan_email_notices(50, 3, false, agora + interval '6 hours');
  perform pg_temp.say('depois de 3 tentativas desiste (limite de tentativas)', n = 0);
  perform pg_temp.as_admin();
  perform pg_temp.say('nenhum aviso passou de 3 tentativas', (select max(attempts) from public.loan_email_notices) = 3);

  ---------------------------------------------------------------- RENOVAÇÃO e DIA SEGUINTE
  -- Renovou: o prazo mudou, então a nova data pode ser avisada de novo (a chave inclui o dia do prazo).
  update public.loans set due_at = '2026-11-14 18:00-03' where id = a;
  perform pg_temp.as_service();
  select count(*) into n from public.claim_loan_email_notices(50, 3, false, agora + interval '7 hours');
  perform pg_temp.say('prazo novo gera aviso novo (1 só)', n = 1);
  -- No dia seguinte (14/11) a situação muda e cada mudança é um aviso novo: a e b "vencem hoje", c passa a "atrasado",
  -- d entra em "a vencer" (faltam 2 dias). O e (atrasado desde 10/11) já gastou as 3 tentativas e não volta.
  select count(*) into n from public.claim_loan_email_notices(50, 3, false, '2026-11-14 12:00-03');
  perform pg_temp.say('no dia seguinte: 4 avisos novos, um por mudança de situação', n = 4);

  ---------------------------------------------------------------- LIMITE POR EXECUÇÃO e ORDEM
  perform pg_temp.as_admin();
  delete from public.loan_email_notices;
  update public.loans set returned_at = now() where id in (a, c, e, b, d);
  insert into public.loans (id, book_id, user_id, borrowed_at, due_at) values
    (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000009', ANA, '2026-11-06 10:00-03', '2026-11-13 18:00-03') returning id into i;       -- vence hoje
  insert into public.loans (book_id, user_id, borrowed_at, due_at) values
    ('b0000000-0000-0000-0000-000000000010', ANA, '2026-11-03 10:00-03', '2026-11-10 18:00-03'),                                              -- atrasado
    ('b0000000-0000-0000-0000-000000000011', ANA, '2026-11-08 10:00-03', '2026-11-15 18:00-03');                                              -- a vencer
  perform pg_temp.as_service();
  select array_agg(kind order by kind) into function_names from public.claim_loan_email_notices(2, 3, false, agora);
  perform pg_temp.say('p_limit = 2 devolve só 2 e começam por "vence hoje" e "a vencer"', coalesce(function_names = array['due_soon','due_today'], false));
  select count(*) into n from public.claim_loan_email_notices(2, 3, false, agora + interval '1 minute');
  perform pg_temp.say('o que sobrou (1 atrasado) entra na execução seguinte', n = 1);
  select count(*) into n from public.claim_loan_email_notices(0, 3, true, agora);
  perform pg_temp.say('limite 0 vira 1 (nunca devolve sem limite)', n <= 1);
  select count(*) into n from public.claim_loan_email_notices(100000, 3, true, agora + interval '1 day');
  perform pg_temp.say('limite enorme é cortado em 100', n <= 100);

  ---------------------------------------------------------------- PREFERÊNCIA (LGPD)
  perform pg_temp.as_anon();
  perform pg_temp.say('anônimo NÃO muda preferência', pg_temp.err('select public.set_my_email_notices(false)') like 'permission denied%');
  perform pg_temp.as_user(ANA::text);
  perform pg_temp.say('aluno lê a própria preferência (padrão: recebe)', (select email_notices from public.profiles where id = ANA) is true);
  perform pg_temp.say('aluno NÃO altera pelo update direto (RLS)', pg_temp.err(format('update public.profiles set email_notices = false where id = %L', ANA)) = 'ok'
    and (select email_notices from public.profiles where id = ANA) is true);
  perform pg_temp.say('aluno desliga os avisos pela função', public.set_my_email_notices(false) = false);
  perform pg_temp.say('preferência gravada', (select email_notices from public.profiles where id = ANA) is false);
  perform pg_temp.as_admin();
  perform pg_temp.say('auditoria registra a mudança (profile_updated, só id)',
    exists (select 1 from public.audit_logs where action = 'profile_updated' and actor_id = ANA and details = jsonb_build_object('profile_id', ANA)));
  perform pg_temp.as_service();
  select count(*) into n from public.claim_loan_email_notices(50, 3, true, '2026-11-20 12:00-03');
  perform pg_temp.say('quem desligou deixa de ser selecionado', n = 0);
  perform pg_temp.as_user(ANA::text);
  perform public.set_my_email_notices(true);
  perform pg_temp.as_service();
  select count(*) into n from public.claim_loan_email_notices(50, 3, true, '2026-11-20 12:00-03');
  perform pg_temp.say('ao religar volta a ser selecionado', n >= 1);
  perform pg_temp.as_user(CRIS::text);
  perform pg_temp.say('perfil inativo não muda preferência', pg_temp.err('select public.set_my_email_notices(true)') = 'profile_not_found');
end $$;
