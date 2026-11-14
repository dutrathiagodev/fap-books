-- Migration: a busca do acervo pagina no banco sem numerar nem ordenar o acervo inteiro (card 0260, achado da prova de carga 0235).
-- Problema medido com 20 mil livros: a search_books numerava TODAS as linhas (row_number() sobre o acervo e filtro por rn),
-- então cada página ordenava 20 mil linhas (Sort de ~25 ms dos ~35 ms; o Postgres chegou a ~460% de CPU com 50 usuários).
-- Correção: ORDER BY ... LIMIT ... OFFSET direto na consulta. Sem filtro de texto a ordem por título (e por autor) usa os
-- índices de books e a consulta para de ler assim que junta a página; o ISBN e "tem histórico" continuam sendo buscados só
-- para as linhas da página (no máximo 50).
--
-- Mesmo contrato de antes: mesmas colunas, mesma ordem (relevance | title | author | available), total_count, página
-- além do fim devolve a última, no máximo 50 por página, livro inativo só para a bibliotecária, security definer com
-- search_path vazio e os mesmos grants. Só muda COMO a página é montada (a função é substituída no lugar, sem mexer em dado).
--
-- "plan_cache_mode = force_custom_plan": o plpgsql reaproveita o plano depois de 5 chamadas e, no plano genérico, o
-- "case when p_sort = ..." do ORDER BY não é resolvido na hora do planejamento: o banco voltaria a ordenar tudo e o filtro
-- "p_situation = 'all'" voltaria a juntar empréstimos e reservas à toa. Com plano por chamada (planejar custa < 1 ms) o
-- parâmetro vira constante, o ORDER BY vira só "title, id" e o índice é usado.

-- Ordem por título sem filtro de status (a bibliotecária vê ativos e inativos juntos) e desempate por id estável:
-- (status, title, id) serve a listagem de ativos; (title, id) serve a de todos. Sem eles o Postgres ainda usa idx_books_title
-- com ordenação incremental, mas estes deixam o caminho direto.
create index idx_books_status_title_id on public.books (status, title, id);
create index idx_books_title_id on public.books (title, id);
-- Ordem por autor (depois título e id).
create index idx_books_status_author_title_id on public.books (status, author, title, id);

-- Novidades do acervo (home e pesquisa do aluno): livros ativos COM capa, do mais novo ao mais antigo. Sem o índice cada
-- visita lia o acervo inteiro à procura das capas.
create index idx_books_new_arrivals on public.books (created_at desc) where status = 'active' and cover_url is not null;

create or replace function public.search_books(
  p_query text default null,
  p_category text default null,
  p_situation text default 'all',
  p_status text default 'active',
  p_sort text default 'relevance',
  p_page integer default 1,
  p_page_size integer default 12
)
returns table (
  id uuid, title text, author text, category text, code text, quantity integer, status text, cover_url text,
  open_loans integer, has_active_reservation boolean, next_due_at timestamptz, situation text,
  total_count bigint, page_number integer, isbn text, has_history boolean
)
language plpgsql
stable
security definer
set search_path = ''
set plan_cache_mode = force_custom_plan
as $$
declare
  v_like text := public.catalog_like(p_query);
  v_fold text := public.search_fold(left(btrim(coalesce(p_query, '')), 60));   -- termo puro, para igualdade
  v_esc text := case when v_like is null then '' else substr(v_like, 2, length(v_like) - 2) end;   -- termo escapado, sem os % das pontas
  v_size integer := least(greatest(coalesce(p_page_size, 12), 1), 50);
  v_total bigint;
  v_page integer;
begin
  perform public.catalog_guard(p_status);
  if p_situation not in ('all', 'available', 'reserved', 'unavailable') then
    raise exception 'invalid_situation' using errcode = '22023';
  end if;
  if p_sort not in ('relevance', 'title', 'author', 'available') then
    raise exception 'invalid_sort' using errcode = '22023';
  end if;

  -- Total do filtro (para a paginação). Com "todas as situações" o planejador descarta as junções de empréstimos e
  -- reservas e conta só em books, por índice.
  select count(*) into v_total
  from public.catalog_rows(v_like, p_category, p_status) c
  where p_situation = 'all' or c.situation = p_situation;

  v_page := least(greatest(coalesce(p_page, 1), 1), greatest(1, ceil(v_total::numeric / v_size)::integer));

  return query
  with page as (
    select c.*,
           -- Chaves de ordem: só a primeira muda conforme p_sort; as constantes somem do plano.
           case
             when p_sort = 'available' then
               case c.situation when 'available' then 0 when 'reserved' then 1 when 'unavailable' then 2 else 3 end
             when p_sort = 'relevance' and v_like is not null then
               case
                 when f.ft = v_fold then 0
                 when f.ft like v_esc || '%' then 1
                 when f.ft like '% ' || v_esc || '%' then 2
                 when f.ft like '%' || v_esc || '%' then 3
                 when public.search_fold(c.author) like '%' || v_esc || '%' then 4
                 else 5
               end
             else 0
           end as k1,
           case when p_sort = 'author' then c.author end as k2
    from public.catalog_rows(v_like, p_category, p_status) c
    -- Título sem acento calculado uma vez por linha (o "offset 0" impede o planejador de copiar a expressão 4 vezes).
    cross join lateral (select public.search_fold(c.title) as ft offset 0) f
    where p_situation = 'all' or c.situation = p_situation
    order by k1, k2, c.title, c.id
    limit v_size offset (v_page - 1) * v_size
  )
  select p.id, p.title, p.author, p.category, p.code, p.quantity, p.status, p.cover_url,
         p.open_loans, p.has_active_reservation, p.next_due_at, p.situation, v_total, v_page,
         b.isbn,
         (exists (select 1 from public.loans l where l.book_id = p.id)
          or exists (select 1 from public.reservations r where r.book_id = p.id)
          or exists (select 1 from public.pedagogical_reservation_books pb where pb.book_id = p.id))
  from page p
  join public.books b on b.id = p.id
  order by p.k1, p.k2, p.title, p.id;
end;
$$;

revoke execute on function public.search_books(text, text, text, text, text, integer, integer) from public, anon;
grant execute on function public.search_books(text, text, text, text, text, integer, integer) to authenticated;
