-- Livros de teste para a prova de carga [FAP - 0232]: 20 mil títulos (limite alto da premissa do card 0225).
-- SÓ EM BANCO LOCAL OU DE TESTE. Nunca rode no projeto de produção: o plano gratuito tem 500 MB e isto mistura
-- dados falsos com o acervo real. Todos os códigos começam com "CARGA-", o que torna a limpeza segura.
--
-- Criar:   docker exec -i <banco> psql -U postgres -q < scripts/seed-carga.sql
-- Limpar:  delete from public.books where code like 'CARGA-%';
-- Idempotente: rodar de novo não duplica (o código é único).
insert into public.books (title, author, category, code, quantity)
select
  'Livro de carga ' || lpad(n::text, 5, '0'),
  'Autor ' || (n % 800),
  (array['Literatura', 'Ciências', 'História', 'Matemática', 'Tecnologia', 'Artes', 'Geografia', 'Filosofia'])[1 + n % 8],
  'CARGA-' || lpad(n::text, 5, '0'),
  1 + n % 3
from generate_series(1, 20000) as n
on conflict (code) do nothing;
