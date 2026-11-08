-- Migration: índices da busca e da disponibilidade do acervo (card 0228, parte do 0225).
-- Hoje a pesquisa lê livros, empréstimos e reservas inteiros no app e filtra na memória; o PostgREST devolve no máximo
-- 1000 linhas e corta o resto em silêncio. Esta migration prepara o banco para fazer isso com índice (as funções que usam
-- estes índices estão na migration seguinte). Só acrescenta índices e uma função auxiliar: nenhum dado muda.

-- pg_trgm: busca por pedaço de texto ("%termo%") com índice. unaccent: busca sem acento ("sao paulo" acha "São Paulo").
-- No Supabase as extensões ficam no schema "extensions" (fora do public, que a API expõe).
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

-- Texto sem acento e em minúsculas, a base de todo índice e de toda comparação da busca.
-- O unaccent "puro" não é imutável, e índice só aceita função imutável; fixar o dicionário o torna seguro para isso.
create function public.search_fold(p_text text)
returns text
language sql
immutable
parallel safe
strict
set search_path = ''
as $$
  select lower(extensions.unaccent('extensions.unaccent'::regdictionary, p_text));
$$;

revoke execute on function public.search_fold(text) from public, anon;
grant execute on function public.search_fold(text) to authenticated;

-- Índices trigrama (GIN): título, autor, código e ISBN, os quatro campos que a busca já consulta.
create index idx_books_title_trgm on public.books using gin (public.search_fold(title) extensions.gin_trgm_ops);
create index idx_books_author_trgm on public.books using gin (public.search_fold(author) extensions.gin_trgm_ops);
create index idx_books_code_trgm on public.books using gin (public.search_fold(code) extensions.gin_trgm_ops);
create index idx_books_isbn_trgm on public.books using gin (public.search_fold(isbn) extensions.gin_trgm_ops);

-- Listagem do acervo: filtra por status e ordena por título sem ordenar a tabela toda.
create index idx_books_status_title on public.books (status, title);

-- Empréstimos em aberto por livro, já com a data de devolução (disponibilidade e "volta em ..."): só lê o índice.
create index idx_loans_open_by_book on public.loans (book_id) include (due_at) where returned_at is null;

-- Reservas que ainda guardam um exemplar (aguardando ou pronta para retirada), por livro.
create index idx_reservations_active_by_book on public.reservations (book_id) where status in ('waiting', 'ready');
