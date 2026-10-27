#!/usr/bin/env bash
# Restaura um backup do FAP Books num banco de DESTINO [FAP - 0015].
# Antes: o destino precisa ter a estrutura pronta (aplique supabase/migrations/ nele).
# Teste sempre num banco de teste (Docker ou um projeto novo), nunca no banco real sem necessidade.
#
# Variáveis de ambiente:
#   DESTINO_DB_URL      conexão do banco de destino
#   BACKUP_PASSPHRASE   a mesma senha usada no backup
# Uso: scripts/restaurar-backup.sh fap-books-AAAAMMDD-HHMMSS.tar.enc
set -euo pipefail

: "${DESTINO_DB_URL:?Defina DESTINO_DB_URL}"
: "${BACKUP_PASSPHRASE:?Defina BACKUP_PASSPHRASE}"
arquivo="${1:?Informe o arquivo .tar.enc}"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

echo "1/3 Descriptografando..."
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass env:BACKUP_PASSPHRASE -in "$arquivo" -out "$tmp/backup.tar"
tar -C "$tmp" -xf "$tmp/backup.tar"

echo "2/3 Restaurando os dados (sem disparar gatilhos, para não duplicar perfis)..."
{
  echo "set session_replication_role = replica;"
  pg_restore --data-only --no-owner --no-privileges -f - "$tmp/dados-auth.dump"
  pg_restore --data-only --no-owner --no-privileges -f - "$tmp/dados-public.dump"
} | psql "$DESTINO_DB_URL" -X -q -v ON_ERROR_STOP=1 --single-transaction

echo "3/3 Conferindo as contagens (esperado = do dia do backup)..."
falhou=0
while read -r tabela esperado; do
  atual="$(psql "$DESTINO_DB_URL" -X -q -t -A -c "select count(*) from $tabela")"
  if [ "$atual" = "$esperado" ]; then echo "  OK    $tabela: $atual"; else echo "  DIFERENTE $tabela: esperado $esperado, restaurado $atual"; falhou=1; fi
done < "$tmp/contagem.txt"
[ "$falhou" = 0 ] && echo "Restauração conferida." || { echo "Há diferenças: veja acima."; exit 1; }
