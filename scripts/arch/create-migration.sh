#!/usr/bin/env bash
# Cria um arquivo de migration com o modelo seguro (RLS + permissões) em supabase/migrations/.
# Uso: scripts/arch/create-migration.sh <nome_em_snake_case>
# Exemplo: scripts/arch/create-migration.sh create_books_table
set -euo pipefail

NAME="${1:-}"
if [[ ! "$NAME" =~ ^[a-z][a-z0-9]*(_[a-z0-9]+)*$ ]]; then
  echo "Uso: $0 <nome_em_snake_case>   (ex.: create_books_table)" >&2
  exit 1
fi

ROOT="${ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
DIR="$ROOT/supabase/migrations"
mkdir -p "$DIR"
FILE="$DIR/$(date -u +%Y%m%d%H%M%S)_${NAME}.sql"

cat > "$FILE" <<'EOF'
-- Migration: descreva a mudança em uma frase.
-- Regras (docs/architecture/supabase.spec.md):
--   * nunca edite uma migration já aplicada; crie outra
--   * toda tabela nova liga o RLS, tem grant mínimo e policies por perfil

-- Modelo de tabela (apague o que não usar):
-- create table public.exemplos (
--   id uuid primary key default gen_random_uuid(),
--   name text not null,
--   created_at timestamptz not null default now(),
--   updated_at timestamptz not null default now()
-- );
--
-- alter table public.exemplos enable row level security;
--
-- grant select on public.exemplos to authenticated;
--
-- create policy "exemplos_select_logged_in" on public.exemplos
--   for select to authenticated using (true);
EOF

echo "Migration criada: ${FILE#"$ROOT"/}"
echo "Confira o checklist em docs/architecture/supabase.spec.md antes de abrir o PR."
