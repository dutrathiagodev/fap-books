-- Código do livro único sem diferenciar maiúsculas de minúsculas (card 0118).
-- A coluna books.code já é única, mas "612.01 G993t" e "612.01 g993t" valiam como livros diferentes.
-- O índice abaixo recusa o segundo; o app já trata a violação de unicidade (23505) como "código repetido".
--
-- Antes de aplicar, confira se o acervo já tem códigos repetidos só pela caixa (o índice falharia):
--   select lower(code), count(*) from public.books group by 1 having count(*) > 1;

create unique index books_code_lower_key on public.books (lower(code));
