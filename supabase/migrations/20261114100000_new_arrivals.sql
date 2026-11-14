-- Migration: novidades do acervo em UMA chamada ao banco (card 0267, achado da prova de carga do card 0260).
-- Antes a home e a pesquisa do aluno faziam duas idas ao banco por pedido: a leitura dos livros mais recentes e depois
-- book_availability_for_books para a situação deles. Cada ida custa CPU do servidor Node (cliente HTTP, JSON, RLS no
-- PostgREST), e a pesquisa do aluno já estava limitada pelo Node, não pelo banco.
-- Esta função devolve os livros ativos mais recentes COM capa e a disponibilidade deles juntos, com as mesmas regras de
-- antes: mesmo filtro (status ativo, com capa), mesma ordem (created_at desc), mesmas colunas de disponibilidade de
-- book_availability_for_books (empréstimos em aberto, reserva em fila ou pronta, próxima devolução). Sem cache: a
-- situação continua sendo a de agora. Mesmo controle de acesso da busca (catalog_guard: perfil ativo), security definer com
-- search_path vazio e execução só para quem está logado. Usa o índice idx_books_new_arrivals. No máximo 20 por chamada.
create function public.new_arrivals(p_limit integer default 5)
returns table (
  id uuid,
  title text,
  author text,
  category text,
  code text,
  isbn text,
  quantity integer,
  cover_url text,
  open_loans integer,
  has_active_reservation boolean,
  next_due_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.catalog_guard('active');
  return query
  select
    b.id, b.title, b.author, b.category, b.code, b.isbn, b.quantity, b.cover_url,
    (select count(*)::integer from public.loans l where l.book_id = b.id and l.returned_at is null),
    exists (select 1 from public.reservations r where r.book_id = b.id and r.status in ('waiting', 'ready')),
    (select min(l.due_at) from public.loans l where l.book_id = b.id and l.returned_at is null)
  from public.books b
  where b.status = 'active' and b.cover_url is not null
  order by b.created_at desc
  limit least(greatest(coalesce(p_limit, 5), 1), 20);
end;
$$;

revoke execute on function public.new_arrivals(integer) from public, anon;
grant execute on function public.new_arrivals(integer) to authenticated;
