-- Telefone (WhatsApp) do usuário, para os avisos da biblioteca (card 0121, cadastro de usuários).
-- Opcional e só números com DDD (10 ou 11 dígitos). O RLS de profiles não muda: cada pessoa lê o próprio perfil
-- e só a bibliotecária lê todos e altera.
alter table public.profiles
  add column phone text;

alter table public.profiles
  add constraint profiles_phone_format check (phone is null or phone ~ '^[0-9]{10,11}$');
