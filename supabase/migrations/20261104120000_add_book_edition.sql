-- Edição do livro (cadastro de livro, Figma card 0117, campo "Edição / ano").
-- Texto livre (ex.: "13ª edição (2021)"), opcional: o acervo já cadastrado continua valendo.
-- O RLS de books não muda: todo usuário logado lê, só a bibliotecária escreve.

alter table public.books
  add column edition text check (edition is null or char_length(edition) <= 80);
