-- A matrícula da FAP é o RA do aluno: só números (ex.: 242802). Troca o formato de "letras e números, de 3 a 20"
-- para "só números, de 5 a 8", que cobre o RA de 6 dígitos e deixa folga.
-- Se algum perfil já tiver matrícula com letra, a migração falha sem alterar nada, e a matrícula é corrigida antes.
begin;

alter table public.profiles
  drop constraint profiles_registration_format;

alter table public.profiles
  add constraint profiles_registration_format check (registration is null or registration ~ '^[0-9]{5,8}$');

commit;
