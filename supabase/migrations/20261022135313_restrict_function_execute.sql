-- Funções de gatilho não precisam ser chamadas por ninguém via API (/rest/v1/rpc).
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- rls_auto_enable existe nos projetos do Supabase; só ajusta se estiver presente.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end $$;
