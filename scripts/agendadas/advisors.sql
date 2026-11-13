-- Conferência semanal estilo "Advisors" do Supabase [FAP - 0252], só com consultas ao catálogo do Postgres.
-- Não precisa de token da API de gerenciamento: usa a mesma conexão do backup (SUPABASE_DB_URL). Só lê.
-- Saída: uma linha por achado, "NIVEL|regra|objeto". ERRO derruba o workflow (o GitHub avisa por e-mail); AVISO só lista.
-- Cobre o que o advisor de segurança e o de desempenho do Supabase mais pegam; não substitui o painel (Advisors),
-- que também olha configurações do Auth. Pode ser rodado à mão: psql "$SUPABASE_DB_URL" -At -f scripts/agendadas/advisors.sql
with achados as (
  -- Tabela do schema public sem RLS: qualquer pessoa com a chave pública leria tudo.
  select 'ERRO' as nivel, 'tabela_sem_rls' as regra, format('%I.%I', n.nspname, c.relname) as objeto
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity

  union all
  -- View do schema public sem security_invoker: roda com o dono e ignora o RLS de quem consulta.
  select 'ERRO', 'view_sem_security_invoker', format('%I.%I', n.nspname, c.relname)
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'v'
    and not coalesce((select option_value::boolean from pg_options_to_table(c.reloptions) where option_name = 'security_invoker'), false)

  union all
  -- Função SECURITY DEFINER sem search_path fixo: permite sequestrar a função com um schema falso.
  select 'ERRO', 'definer_sem_search_path', format('%I.%I', n.nspname, p.proname)
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prosecdef
    and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) cfg where cfg like 'search_path=%')

  union all
  -- Tabela com RLS ligado e nenhuma política: ninguém (exceto a chave de servidor) lê nem grava. Quase sempre é esquecimento.
  select 'AVISO', 'rls_sem_politica', format('%I.%I', n.nspname, c.relname)
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p') and c.relrowsecurity
    and not exists (select 1 from pg_policy pol where pol.polrelid = c.oid)

  union all
  -- Função SECURITY DEFINER que o anônimo pode executar: confira se é de propósito (ex.: categorias públicas).
  select 'AVISO', 'definer_executavel_pelo_anonimo', format('%I.%I', n.nspname, p.proname)
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prosecdef and has_function_privilege('anon', p.oid, 'execute')

  union all
  -- Chave estrangeira sem índice que comece pelas mesmas colunas: apagar ou juntar na tabela pai varre a tabela filha.
  select 'AVISO', 'fk_sem_indice', format('%s (%s)', con.conrelid::regclass, con.conname)
  from pg_constraint con
  where con.contype = 'f' and con.connamespace = 'public'::regnamespace
    and not exists (
      select 1 from pg_index i
      where i.indrelid = con.conrelid and (i.indkey::int2[])[0:cardinality(con.conkey) - 1] = con.conkey
    )

  union all
  -- Índice grande que nunca foi usado desde o último reset das estatísticas: ocupa espaço do plano gratuito.
  select 'AVISO', 'indice_grande_sem_uso', format('%s (%s)', s.indexrelid::regclass, pg_size_pretty(pg_relation_size(s.indexrelid)))
  from pg_stat_user_indexes s join pg_index i on i.indexrelid = s.indexrelid
  where s.schemaname = 'public' and s.idx_scan = 0 and not i.indisunique and not i.indisprimary
    and pg_relation_size(s.indexrelid) > 8 * 1024 * 1024
)
select nivel || '|' || regra || '|' || objeto from achados order by nivel, regra, objeto;
