#!/usr/bin/env bash
# Saúde do Supabase no plano gratuito [FAP - 0231 e 0232].
# 1) Mantém o projeto ativo: o plano gratuito pausa depois de uma semana sem uso, e esta consulta conta como uso.
# 2) Mede o banco e os arquivos contra o limite do plano e FALHA (o GitHub avisa por e-mail) acima de 80%.
# 3) Conta os registros de auditoria mais velhos que a retenção e, só se pedido, apaga.
# 4) Lista as consultas mais lentas (pg_stat_statements).
# Só lê, exceto no passo 3 com APAGAR_AUDITORIA=sim. Rodar de novo não muda nada. Veja docs/infra-e-plano-gratuito.md.
#
# Variáveis de ambiente:
#   SUPABASE_DB_URL     endereço de conexão do banco (o mesmo do backup; nunca vai para o Git)
#   APAGAR_AUDITORIA    "sim" apaga os registros de auditoria acima da retenção (padrão: só conta)
#   RETENCAO_MESES      meses de auditoria guardados (padrão: 24)
set -euo pipefail

: "${SUPABASE_DB_URL:?Defina SUPABASE_DB_URL}"

LIMITE_BANCO_MB=500      # plano gratuito: 500 MB de banco
LIMITE_ARQUIVOS_MB=1024  # plano gratuito: 1 GB de arquivos
ALERTA_PERCENTUAL=80
retencao_meses="${RETENCAO_MESES:-24}"
[[ "$retencao_meses" =~ ^[0-9]+$ ]] || { echo "::error::RETENCAO_MESES precisa ser um número"; exit 1; }

consulta() { psql "$SUPABASE_DB_URL" --no-psqlrc -v ON_ERROR_STOP=1 -At -c "$1"; }
resumo() { if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then echo "$1" >> "$GITHUB_STEP_SUMMARY"; fi; echo "$1"; }

consulta "select 1" > /dev/null
resumo "## Saúde do Supabase"
resumo "- Projeto ativo (consulta de manutenção respondeu)."

banco_mb=$(consulta "select (pg_database_size(current_database()) / 1048576)::int")
arquivos_mb=0
if [ "$(consulta "select to_regclass('storage.objects') is not null")" = "t" ]; then
  arquivos_mb=$(consulta "select (coalesce(sum((metadata->>'size')::bigint), 0) / 1048576)::int from storage.objects")
fi
resumo "- Banco: ${banco_mb} MB de ${LIMITE_BANCO_MB} MB."
resumo "- Arquivos (capas): ${arquivos_mb} MB de ${LIMITE_ARQUIVOS_MB} MB."

falhou=0
if [ $((banco_mb * 100)) -ge $((LIMITE_BANCO_MB * ALERTA_PERCENTUAL)) ]; then
  echo "::error::Banco em ${banco_mb} MB, acima de ${ALERTA_PERCENTUAL}% do limite de ${LIMITE_BANCO_MB} MB. Veja o plano B em docs/infra-e-plano-gratuito.md"
  falhou=1
fi
if [ $((arquivos_mb * 100)) -ge $((LIMITE_ARQUIVOS_MB * ALERTA_PERCENTUAL)) ]; then
  echo "::error::Arquivos em ${arquivos_mb} MB, acima de ${ALERTA_PERCENTUAL}% do limite de ${LIMITE_ARQUIVOS_MB} MB. Veja o plano B em docs/infra-e-plano-gratuito.md"
  falhou=1
fi

antigos=$(consulta "select count(*) from public.audit_logs where created_at < now() - interval '${retencao_meses} months'")
if [ "${APAGAR_AUDITORIA:-nao}" = "sim" ] && [ "$antigos" -gt 0 ]; then
  apagados=$(consulta "with a as (delete from public.audit_logs where created_at < now() - interval '${retencao_meses} months' returning 1) select count(*) from a")
  resumo "- Auditoria: ${apagados} registros com mais de ${retencao_meses} meses apagados."
else
  resumo "- Auditoria: ${antigos} registros com mais de ${retencao_meses} meses (nada apagado; para apagar, rode o workflow à mão com apagar_auditoria = sim)."
fi

if [ "$(consulta "select count(*) from pg_extension where extname = 'pg_stat_statements'")" = "1" ]; then
  resumo ""
  resumo "### 10 consultas mais lentas (tempo médio em ms)"
  resumo '```'
  consulta "select round(mean_exec_time::numeric, 1) || ' ms | ' || calls || ' chamadas | ' || left(regexp_replace(query, '\s+', ' ', 'g'), 120) from pg_stat_statements where query not ilike '%pg_stat_statements%' order by mean_exec_time desc limit 10" || true
  resumo '```'
else
  resumo "- pg_stat_statements não está ativa; ative em Database > Extensions para listar consultas lentas."
fi

exit $falhou
