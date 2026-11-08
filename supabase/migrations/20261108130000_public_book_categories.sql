-- Migration: categorias do acervo legíveis sem login (FAP-0230, cache de dado compartilhado).
-- O Next guarda a lista de categorias em cache compartilhado entre todas as pessoas. Esse cache não tem sessão
-- (não existe "pessoa" dentro dele), então a leitura precisa ser possível com a chave pública (anon).
-- Só devolve nomes de categoria, sem repetir: nenhum título, código, quantidade ou empréstimo sai por aqui.

create function public.public_book_categories(p_active_only boolean default true)
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select distinct b.category
  from public.books b
  where b.category is not null
    and (not p_active_only or b.status = 'active')
  order by b.category
  limit 200;
$$;

revoke execute on function public.public_book_categories(boolean) from public;
grant execute on function public.public_book_categories(boolean) to anon, authenticated;
