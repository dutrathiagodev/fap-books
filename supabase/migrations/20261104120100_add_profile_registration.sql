-- Matrícula e curso do usuário para o balcão de empréstimo (card 0130, frame 0129).
-- A bibliotecária procura quem vai pegar o livro pelo nome ou pela matrícula; o cartão mostra o curso.
-- Os dois campos são opcionais: quem já tem perfil continua valendo, e a bibliotecária preenche aos poucos.
-- O RLS de profiles não muda: só a bibliotecária lê todos os perfis e só ela altera (inclusive a matrícula).
-- Cada pessoa continua vendo apenas o próprio perfil, então nenhuma leitura geral é aberta.

alter table public.profiles
  add column registration text,
  add column course text;

-- Formato: letras e números (sem espaço, curinga ou símbolo), de 3 a 20 caracteres.
alter table public.profiles
  add constraint profiles_registration_format check (registration is null or registration ~ '^[0-9A-Za-z]{3,20}$'),
  add constraint profiles_course_length check (course is null or char_length(course) between 2 and 80);

-- Única quando preenchida (o Postgres aceita vários nulos). O índice também acelera a busca pela matrícula.
alter table public.profiles
  add constraint profiles_registration_key unique (registration);
