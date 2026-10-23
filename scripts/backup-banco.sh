#!/usr/bin/env bash
# Backup do banco do FAP Books [FAP - 0015].
# Gera UM arquivo criptografado com os dados do schema public e os logins (auth.users e auth.identities).
# A estrutura (tabelas, regras de acesso) NÃO entra: ela vem das migrations em supabase/migrations/.
# Não inclui os arquivos do Storage (capas): o banco guarda só o endereço delas.
#
# Variáveis de ambiente:
#   SUPABASE_DB_URL     endereço de conexão do banco (use o do "Session pooler"; nunca vai para o Git)
#   BACKUP_PASSPHRASE   senha que criptografa o arquivo (guarde fora do Git, com quem restaura)
# Uso: scripts/backup-banco.sh [pasta-de-saída]   (padrão: ./backups)
set -euo pipefail

: "${SUPABASE_DB_URL:?Defina SUPABASE_DB_URL}"
: "${BACKUP_PASSPHRASE:?Defina BACKUP_PASSPHRASE}"

saida="${1:-backups}"
carimbo="$(date -u +%Y%m%d-%H%M%S)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
mkdir -p "$saida"

echo "1/4 Exportando os dados..."
# Dois dumps: combinar --schema com --table no mesmo pg_dump ignora o schema e perde as tabelas do public.
pg_dump "$SUPABASE_DB_URL" --data-only --format=custom --no-owner --no-privileges \
  --schema=public --file="$tmp/dados-public.dump"
pg_dump "$SUPABASE_DB_URL" --data-only --format=custom --no-owner --no-privileges \
  --table=auth.users --table=auth.identities --file="$tmp/dados-auth.dump"

echo "2/4 Contando as linhas (para conferir na restauração)..."
: > "$tmp/contagem.txt"
for t in $(psql "$SUPABASE_DB_URL" -X -q -t -A -c "select tablename from pg_tables where schemaname='public' order by 1"); do
  echo "public.$t $(psql "$SUPABASE_DB_URL" -X -q -t -A -c "select count(*) from public.$t")" >> "$tmp/contagem.txt"
done
echo "auth.users $(psql "$SUPABASE_DB_URL" -X -q -t -A -c 'select count(*) from auth.users')" >> "$tmp/contagem.txt"
echo "auth.identities $(psql "$SUPABASE_DB_URL" -X -q -t -A -c 'select count(*) from auth.identities')" >> "$tmp/contagem.txt"

echo "3/4 Empacotando..."
tar -C "$tmp" -cf "$tmp/backup.tar" dados-public.dump dados-auth.dump contagem.txt

echo "4/4 Criptografando..."
arquivo="$saida/fap-books-$carimbo.tar.enc"
openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt -pass env:BACKUP_PASSPHRASE -in "$tmp/backup.tar" -out "$arquivo"

echo "Pronto: $arquivo ($(du -h "$arquivo" | cut -f1))"
echo "arquivo=$arquivo" >> "${GITHUB_OUTPUT:-/dev/null}"
