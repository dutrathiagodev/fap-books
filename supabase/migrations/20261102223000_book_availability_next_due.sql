-- Migration: data de devolução prevista na pesquisa de livros (card 0110, frame 0108 do Figma).
-- Acrescenta a book_availability() a menor data de devolução entre os empréstimos em aberto de cada livro: é quando
-- um exemplar deve voltar para a estante. Continua sem dado de pessoa: só a data, nunca quem pegou.
-- Mudar as colunas de retorno exige apagar e criar a função de novo, e repetir o revoke e o grant.
-- O app funciona antes e depois desta migration (sem a coluna, a data simplesmente não aparece).

drop function public.book_availability();

create function public.book_availability()
returns table (book_id uuid, open_loans integer, has_active_reservation boolean, next_due_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select
    b.id,
    (select count(*)::integer from public.loans l where l.book_id = b.id and l.returned_at is null),
    exists (select 1 from public.reservations r where r.book_id = b.id and r.status in ('waiting', 'ready')),
    (select min(l.due_at) from public.loans l where l.book_id = b.id and l.returned_at is null)
  from public.books b
  where b.status = 'active'
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.active);
$$;

revoke execute on function public.book_availability() from public, anon;
grant execute on function public.book_availability() to authenticated;
