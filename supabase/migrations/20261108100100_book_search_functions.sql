-- Migration: busca, contadores e disponibilidade do acervo no banco (card 0228, parte do 0225).
-- Estende a book_availability() (que varre todos os livros) com versões que filtram, ordenam e paginam no banco.
-- A book_availability() antiga continua existindo para o app atual funcionar; o app troca para as novas depois.
--
-- Segurança: as funções são "security definer" para contar empréstimos e reservas sem depender do RLS dessas tabelas
-- (que mostra a cada pessoa só os próprios). Elas devolvem só contagens e datas, nunca quem pegou ou reservou.
-- search_path vazio é obrigatório (evita trocar funções pelo nome). Só quem está logado e com perfil ativo recebe dados;
-- livros inativos só a bibliotecária enxerga. Nenhuma consulta devolve mais que 50 linhas (plano gratuito: sem varredura
-- aberta).
--
-- Importante: as funções abaixo são "stable" e rodam no snapshot da chamada. Servem para leitura, nunca para decidir
-- empréstimo (isso é feito nas funções com bloqueio da migration de integridade).

-- Linhas do acervo já com situação, calculada igual ao app (src/domain/books/book-rules.ts, bookSituation):
-- inativo > emprestado (nenhum exemplar livre) > reservado (há reserva ativa) > disponível.
-- Uso interno das funções públicas abaixo: ninguém de fora executa (revoke no fim).
-- p_like já vem sem acento, em minúsculas e com curingas (% e _) do usuário escapados.
create function public.catalog_rows(p_like text, p_category text, p_status text)
returns table (
  id uuid, title text, author text, category text, code text, quantity integer, status text, cover_url text,
  open_loans integer, has_active_reservation boolean, next_due_at timestamptz, situation text
)
language sql
stable
set search_path = ''
as $$
  select
    b.id, b.title, b.author, b.category, b.code, b.quantity, b.status, b.cover_url,
    coalesce(l.open_loans, 0)::integer,
    (r.book_id is not null),
    l.next_due_at,
    case
      when b.status = 'inactive' then 'inactive'
      when b.quantity - coalesce(l.open_loans, 0) <= 0 then 'unavailable'
      when r.book_id is not null then 'reserved'
      else 'available'
    end
  from public.books b
  left join (
    select book_id, count(*) as open_loans, min(due_at) as next_due_at
    from public.loans where returned_at is null group by book_id
  ) l on l.book_id = b.id
  left join (
    select distinct book_id from public.reservations where status in ('waiting', 'ready')
  ) r on r.book_id = b.id
  where (p_status = 'all' or b.status = p_status)
    and (p_category is null or b.category = p_category)
    and (
      p_like is null
      or public.search_fold(b.title) like p_like
      or public.search_fold(b.author) like p_like
      or public.search_fold(b.code) like p_like
      or public.search_fold(b.isbn) like p_like
    );
$$;

revoke execute on function public.catalog_rows(text, text, text) from public, anon, authenticated;

-- Confere quem chama: perfil ativo e, para livro inativo, bibliotecária. Interno.
create function public.catalog_guard(p_status text)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.active) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_status not in ('active', 'inactive', 'all') then
    raise exception 'invalid_status' using errcode = '22023';
  end if;
  -- Livro inativo é assunto da bibliotecária.
  if p_status <> 'active' and not public.is_librarian() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
end;
$$;

revoke execute on function public.catalog_guard(text) from public, anon, authenticated;

-- Termo de busca em padrão LIKE: sem acento, minúsculo, no máximo 60 caracteres, e "\", "%" e "_" valem como texto.
create function public.catalog_like(p_query text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when btrim(coalesce(p_query, '')) = '' then null
    else '%' || replace(replace(replace(public.search_fold(left(btrim(p_query), 60)), '\', '\\'), '%', '\%'), '_', '\_') || '%'
  end;
$$;

revoke execute on function public.catalog_like(text) from public, anon, authenticated;

-- Busca paginada. Situação: all | available | reserved | unavailable. Status: active | inactive | all (os dois últimos só
-- para a bibliotecária). Ordem: relevance (igual ao app: título igual, começa com, palavra começa com, contém, autor,
-- código/ISBN) | title | author | available. Se a página pedida passa do fim, devolve a última.
-- Cada linha traz total_count (todas as linhas do filtro) para a paginação, sem uma segunda consulta.
create function public.search_books(
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
  total_count bigint, page_number integer
)
language plpgsql
stable
security definer
set search_path = ''
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

  select count(*) into v_total
  from public.catalog_rows(v_like, p_category, p_status) c
  where p_situation = 'all' or c.situation = p_situation;

  v_page := least(greatest(coalesce(p_page, 1), 1), greatest(1, ceil(v_total::numeric / v_size)::integer));

  return query
  select c.id, c.title, c.author, c.category, c.code, c.quantity, c.status, c.cover_url,
         c.open_loans, c.has_active_reservation, c.next_due_at, c.situation, v_total, v_page
  from public.catalog_rows(v_like, p_category, p_status) c
  where p_situation = 'all' or c.situation = p_situation
  order by
    case
      when p_sort = 'available' then
        case c.situation when 'available' then 0 when 'reserved' then 1 when 'unavailable' then 2 else 3 end
      when p_sort = 'relevance' and v_like is not null then
        case
          when public.search_fold(c.title) = v_fold then 0
          when public.search_fold(c.title) like v_esc || '%' then 1
          when public.search_fold(c.title) like '% ' || v_esc || '%' then 2
          when public.search_fold(c.title) like '%' || v_esc || '%' then 3
          when public.search_fold(c.author) like '%' || v_esc || '%' then 4
          else 5
        end
      else 0
    end,
    case when p_sort = 'author' then c.author end,
    c.title,
    c.id
  limit v_size offset (v_page - 1) * v_size;
end;
$$;

revoke execute on function public.search_books(text, text, text, text, text, integer, integer) from public, anon;
grant execute on function public.search_books(text, text, text, text, text, integer, integer) to authenticated;

-- Contadores do topo do acervo em uma consulta só (substitui ler todos os empréstimos e reservas no app).
-- Mesmo filtro da busca, para os números baterem com a lista. "inactive" e "total" contam à parte.
create function public.book_situation_counts(
  p_query text default null,
  p_category text default null,
  p_status text default 'active'
)
returns table (available bigint, reserved bigint, unavailable bigint, inactive bigint, total bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.catalog_guard(p_status);
  return query
  select
    count(*) filter (where c.situation = 'available'),
    count(*) filter (where c.situation = 'reserved'),
    count(*) filter (where c.situation = 'unavailable'),
    count(*) filter (where c.situation = 'inactive'),
    count(*)
  from public.catalog_rows(public.catalog_like(p_query), p_category, p_status) c;
end;
$$;

revoke execute on function public.book_situation_counts(text, text, text) from public, anon;
grant execute on function public.book_situation_counts(text, text, text) to authenticated;

-- Disponibilidade só dos livros pedidos (a página atual ou o livro do detalhe: passe um id só). No máximo 100 por chamada.
-- Mesmas colunas da book_availability(), mas sem varrer o acervo todo.
create function public.book_availability_for_books(p_book_ids uuid[])
returns table (book_id uuid, open_loans integer, has_active_reservation boolean, next_due_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.catalog_guard('active');
  if coalesce(cardinality(p_book_ids), 0) > 100 then
    raise exception 'too_many_books' using errcode = '22023';
  end if;
  return query
  select
    b.id,
    (select count(*)::integer from public.loans l where l.book_id = b.id and l.returned_at is null),
    exists (select 1 from public.reservations r where r.book_id = b.id and r.status in ('waiting', 'ready')),
    (select min(l.due_at) from public.loans l where l.book_id = b.id and l.returned_at is null)
  from public.books b
  where b.id = any (p_book_ids) and b.status = 'active';
end;
$$;

revoke execute on function public.book_availability_for_books(uuid[]) from public, anon;
grant execute on function public.book_availability_for_books(uuid[]) to authenticated;

-- Categorias do acervo, sem repetir, em uma consulta (as opções do filtro). Só de livros ativos.
create function public.book_categories()
returns table (category text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.catalog_guard('active');
  return query
  select distinct b.category from public.books b
  where b.status = 'active' and b.category is not null
  order by b.category
  limit 200;
end;
$$;

revoke execute on function public.book_categories() from public, anon;
grant execute on function public.book_categories() to authenticated;
