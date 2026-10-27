-- Dados de teste (fictícios) para o time ver as telas funcionando. [FAP - 0185]
-- Pode rodar mais de uma vez: livros repetidos são ignorados (o código é único).
-- Como rodar: docs/database/modelo-de-dados.md (seção "Dados de teste").

insert into public.books (title, author, category, code, quantity) values
  ('Dom Casmurro', 'Machado de Assis', 'Romance', 'T-001', 3),
  ('Memórias Póstumas de Brás Cubas', 'Machado de Assis', 'Romance', 'T-002', 2),
  ('O Cortiço', 'Aluísio Azevedo', 'Romance', 'T-003', 2),
  ('Vidas Secas', 'Graciliano Ramos', 'Romance', 'T-004', 4),
  ('Capitães da Areia', 'Jorge Amado', 'Romance', 'T-005', 3),
  ('A Hora da Estrela', 'Clarice Lispector', 'Romance', 'T-006', 2),
  ('Grande Sertão: Veredas', 'João Guimarães Rosa', 'Romance', 'T-007', 1),
  ('O Alienista', 'Machado de Assis', 'Conto', 'T-008', 2),
  ('Clean Code', 'Robert C. Martin', 'Tecnologia', 'T-009', 2),
  ('Código Limpo na Prática', 'Autor Fictício', 'Tecnologia', 'T-010', 1),
  ('Introdução a Redes de Computadores', 'Autor Fictício', 'Tecnologia', 'T-011', 3),
  ('Banco de Dados para Iniciantes', 'Autor Fictício', 'Tecnologia', 'T-012', 2),
  ('Lógica de Programação', 'Autor Fictício', 'Tecnologia', 'T-013', 5),
  ('Cálculo Básico', 'Autor Fictício', 'Matemática', 'T-014', 2),
  ('Estatística Descritiva', 'Autor Fictício', 'Matemática', 'T-015', 1),
  ('História do Brasil', 'Autor Fictício', 'História', 'T-016', 3),
  ('Geografia Geral', 'Autor Fictício', 'Geografia', 'T-017', 2),
  ('Português Instrumental', 'Autor Fictício', 'Língua Portuguesa', 'T-018', 4),
  ('Administração de Empresas', 'Autor Fictício', 'Administração', 'T-019', 2),
  ('Ética e Cidadania', 'Autor Fictício', 'Humanas', 'T-020', 1)
on conflict (code) do nothing;

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
