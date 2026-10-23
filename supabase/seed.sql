-- Dados de teste (livros reais, empréstimos fictícios) para o time ver as telas funcionando. [FAP - 0185]
-- Os livros e as categorias são os mesmos que aparecem nas telas do Figma (cards 0108 e 0213).
-- Pode rodar mais de uma vez: o livro com o mesmo código é atualizado para estes dados (o código é único).
-- Como rodar: docs/database/modelo-de-dados.md (seção "Dados de teste").

insert into public.books (title, author, category, code, quantity) values
  ('Dom Casmurro', 'Machado de Assis', 'Literatura brasileira', 'T-001', 3),
  ('Memórias Póstumas de Brás Cubas', 'Machado de Assis', 'Literatura brasileira', 'T-002', 2),
  ('O Cortiço', 'Aluísio Azevedo', 'Literatura brasileira', 'T-003', 2),
  ('Vidas Secas', 'Graciliano Ramos', 'Literatura brasileira', 'T-004', 4),
  ('Capitães da Areia', 'Jorge Amado', 'Literatura brasileira', 'T-005', 3),
  ('A Hora da Estrela', 'Clarice Lispector', 'Literatura brasileira', 'T-006', 2),
  ('Grande Sertão: Veredas', 'João Guimarães Rosa', 'Literatura brasileira', 'T-007', 1),
  ('O Alienista', 'Machado de Assis', 'Literatura brasileira', 'T-008', 2),
  ('Clean Code', 'Robert C. Martin', 'Computação', 'T-009', 2),
  ('Algoritmos: Teoria e Prática', 'Thomas Cormen', 'Computação', 'T-010', 5),
  ('Redes de Computadores', 'Andrew S. Tanenbaum', 'Computação', 'T-011', 3),
  ('Sistemas de Banco de Dados', 'Elmasri e Navathe', 'Computação', 'T-012', 2),
  ('Engenharia de Software', 'Ian Sommerville', 'Computação', 'T-013', 2),
  ('Anatomia Humana', 'Henry Gray', 'Saúde', 'T-014', 2),
  ('Tratado de Fisiologia Médica', 'Arthur C. Guyton', 'Saúde', 'T-015', 1),
  ('Introdução à Teologia Sistemática', 'Wayne Grudem', 'Teologia', 'T-016', 2),
  ('O Conflito dos Séculos', 'Ellen G. White', 'Religião', 'T-017', 2),
  ('Fundamentos de Metodologia Científica', 'Marconi e Lakatos', 'Metodologia', 'T-018', 3),
  ('Curso de Direito Constitucional', 'Gilmar Mendes', 'Direito', 'T-019', 4),
  ('Metodologia do Trabalho Científico', 'Antonio Joaquim Severino', 'Metodologia', 'T-020', 2)
on conflict (code) do update
  set title = excluded.title,
      author = excluded.author,
      category = excluded.category,
      quantity = excluded.quantity;

-- Empréstimos de exemplo: só são criados se já existir um perfil de aluno (veja o card 0186).
-- Um em dia, um devolvido e um atrasado, para as telas de empréstimo e multa terem o que mostrar.
do $$
declare
  v_student uuid;
  v_librarian uuid;
begin
  select id into v_student from public.profiles where role = 'student' and active order by created_at limit 1;
  select id into v_librarian from public.profiles where role = 'librarian' and active order by created_at limit 1;

  if v_student is null then
    raise notice 'Sem aluno cadastrado: empréstimos de exemplo não criados.';
    return;
  end if;

  if exists (select 1 from public.loans where user_id = v_student) then
    raise notice 'O aluno já tem empréstimos: nada a fazer.';
    return;
  end if;

  insert into public.loans (book_id, user_id, borrowed_at, due_at, returned_at, created_by)
  select b.id, v_student, x.borrowed_at, x.due_at, x.returned_at, v_librarian
  from (values
    ('T-001', now() - interval '2 days',  now() + interval '5 days',  null::timestamptz),
    ('T-004', now() - interval '20 days', now() - interval '13 days', now() - interval '14 days'),
    ('T-009', now() - interval '12 days', now() - interval '5 days',  null::timestamptz)
  ) as x (code, borrowed_at, due_at, returned_at)
  join public.books b on b.code = x.code;
end;
$$;
