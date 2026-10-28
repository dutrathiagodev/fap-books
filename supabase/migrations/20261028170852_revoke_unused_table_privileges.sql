-- Migration: tira privilégios de tabela que o app nunca usa (defesa em profundidade, LGPD).
-- A API (PostgREST) só usa SELECT, INSERT, UPDATE e DELETE, e o RLS controla quem faz o quê.
-- TRUNCATE, REFERENCES e TRIGGER não passam pelo RLS: com acesso direto ao banco, quem tem TRUNCATE
-- apagaria uma tabela inteira, inclusive a auditoria. Nenhum perfil da API precisa deles.
-- Aplicada no banco real em 28/10/2026 (versão registrada: 20261028170852).

revoke truncate, references, trigger on all tables in schema public from anon, authenticated;

-- Tabelas criadas no futuro já nascem sem esses privilégios.
alter default privileges in schema public revoke truncate, references, trigger on tables from anon, authenticated;
