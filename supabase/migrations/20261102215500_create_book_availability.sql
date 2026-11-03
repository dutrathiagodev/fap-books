-- Migration: situação de cada livro para a pesquisa de alunos e professores (card 0110).
-- O RLS deixa cada pessoa ver só os próprios empréstimos e reservas, então a pesquisa não consegue saber sozinha
-- se um livro está emprestado ou reservado. Esta função devolve só contagens por livro: nunca quem pegou ou reservou.
-- "security definer" lê as tabelas sem depender do RLS delas; por isso o search_path vazio é obrigatório
-- (evita que alguém troque funções pelo nome). Só quem está logado e com perfil ativo recebe linhas.

create function public.book_availability()
returns table (book_id uuid, open_loans integer, has_active_reservation boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select
    b.id,
    (select count(*)::integer from public.loans l where l.book_id = b.id and l.returned_at is null),
    exists (select 1 from public.reservations r where r.book_id = b.id and r.status in ('waiting', 'ready'))
  from public.books b
  where b.status = 'active'
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.active);
$$;

revoke execute on function public.book_availability() from public, anon;
grant execute on function public.book_availability() to authenticated;
