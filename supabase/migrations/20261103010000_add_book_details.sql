-- Dados que a página de detalhe do livro mostra (Figma, card 0111). Todos opcionais: o acervo já cadastrado continua valendo.
-- O RLS de books não muda: todo usuário logado lê, só a bibliotecária escreve.

alter table public.books
  add column isbn text check (isbn is null or char_length(isbn) between 10 and 20),
  add column publisher text check (publisher is null or char_length(publisher) <= 120),
  add column publication_year smallint check (publication_year is null or publication_year between 1400 and 2100),
  add column description text check (description is null or char_length(description) <= 2000),
  add column shelf_location text check (shelf_location is null or char_length(shelf_location) <= 80), -- ex.: Estante 4B · Prateleira 2
  add column cdd text check (cdd is null or char_length(cdd) <= 20);                                  -- classificação decimal de Dewey
