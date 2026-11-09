#!/usr/bin/env bash
# Teste de concorrência de verdade (card 0229): várias conexões ao mesmo tempo contra o mesmo Postgres de teste.
# Um script SQL só roda uma conexão por vez, então este usa vários "psql" em paralelo.
#
# Uso (banco de teste novo, com 00-simula-supabase.sql e todas as migrations já aplicadas; NUNCA no banco real):
#   docker run -d --name fapdb -e POSTGRES_PASSWORD=x postgres:17     # e aplique o simulador + migrations (veja modelo-de-dados.md)
#   supabase/tests/03-concorrencia.sh fapdb
# Cada linha mostra PASS ou FAIL; o código de saída é 1 se algum falhar. Os dados de teste são apagados no fim.
set -u
CONTAINER="${1:?Informe o nome do container do Postgres de teste, ex.: ./03-concorrencia.sh fapdb}"
N=8                                   # conexões simultâneas por cenário
FAILED=0

psql_run() { docker exec -i "$CONTAINER" psql -U postgres -v ON_ERROR_STOP=1 -X -q -t -A "$@"; }
say() { if [ "$2" = "1" ]; then echo "PASS  $1"; else echo "FAIL  $1"; FAILED=1; fi; }
uid() { printf '00000000-0000-0000-0000-0000000c%04d' "$1"; }
bid() { printf 'b0000000-0000-0000-0000-0000000c%04d' "$1"; }
LIB="$(uid 1)"

# Roda um comando SQL como usuário logado (bibliotecária ou aluno) numa conexão própria; imprime OK ou o erro.
as_user() { # $1 = id do usuário, $2 = SQL
  psql_run -c "set role authenticated; select set_config('request.jwt.claim.sub','$1',false); $2" >/dev/null 2>"$3" \
    && echo OK || sed -n 's/^ERROR:  \([a-z_]*\).*/\1/p' "$3" | head -1
}
count_ok() { grep -c '^OK$' "$1"; }

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"; cleanup' EXIT
cleanup() {
  psql_run -c "
    delete from public.audit_logs where actor_id in (select id from public.profiles where email like 'conc%@x.com');
    delete from public.action_keys where actor_id in (select id from public.profiles where email like 'conc%@x.com');
    delete from public.fines where user_id in (select id from public.profiles where email like 'conc%@x.com');
    delete from public.loans where user_id in (select id from public.profiles where email like 'conc%@x.com');
    delete from public.reservations where user_id in (select id from public.profiles where email like 'conc%@x.com');
    delete from public.books where code like 'CONC-%';
    delete from auth.users where email like 'conc%@x.com';" >/dev/null 2>&1
}

# Preparo: 1 bibliotecária, 12 alunos, 12 livros de 1 exemplar.
psql_run -c "
  insert into auth.users (id, email) select '$(uid 1)', 'conc1@x.com';
  insert into auth.users (id, email) select ('00000000-0000-0000-0000-0000000c' || lpad(g::text, 4, '0'))::uuid, 'conc' || g || '@x.com' from generate_series(2, 13) g;
  update public.profiles set role = 'librarian', job_title = 'Teste' where id = '$(uid 1)';
  insert into public.books (id, title, author, code, quantity)
    select ('b0000000-0000-0000-0000-0000000c' || lpad(g::text, 4, '0'))::uuid, 'Livro concorrência ' || g, 'Autor', 'CONC-' || g, 1 from generate_series(1, 12) g;" || { echo "Falha no preparo"; exit 1; }

# 1) N pessoas pegam o ÚLTIMO exemplar do mesmo livro ao mesmo tempo: só uma passa.
: > "$TMP/c1"
for i in $(seq 2 $((N + 1))); do
  ( as_user "$LIB" "select public.create_loan('$(bid 1)', '$(uid "$i")');" "$TMP/e1_$i" >> "$TMP/c1" ) &
done; wait
say "último exemplar: das $N requisições simultâneas só 1 empréstimo passa" "$([ "$(count_ok "$TMP/c1")" = 1 ] && echo 1 || echo 0)"
say "último exemplar: o banco tem exatamente 1 empréstimo aberto do livro" "$([ "$(psql_run -c "select count(*) from public.loans where book_id = '$(bid 1)' and returned_at is null")" = 1 ] && echo 1 || echo 0)"
say "último exemplar: as outras recebem no_copy_available" "$([ "$(grep -c '^no_copy_available$' "$TMP/c1")" = $((N - 1)) ] && echo 1 || echo 0)"

# 2) Uma pessoa, N livros diferentes ao mesmo tempo: o limite de 3 vale (não passam 4 por corrida).
: > "$TMP/c2"
for b in $(seq 2 $((N + 1))); do
  ( as_user "$LIB" "select public.create_loan('$(bid "$b")', '$(uid 10)');" "$TMP/e2_$b" >> "$TMP/c2" ) &
done; wait
say "limite: aluno com $N pedidos simultâneos de livros diferentes fica com exatamente 3" \
  "$([ "$(psql_run -c "select count(*) from public.loans where user_id = '$(uid 10)' and returned_at is null")" = 3 ] && echo 1 || echo 0)"
say "limite: as outras $((N - 3)) recebem loan_limit_reached" "$([ "$(grep -c '^loan_limit_reached$' "$TMP/c2")" = $((N - 3)) ] && echo 1 || echo 0)"

# 3) Clique duplo: a mesma chave de idempotência N vezes → 1 empréstimo; todas devolvem o mesmo id.
KEY="$(cat /proc/sys/kernel/random/uuid)"
for i in $(seq 1 $N); do
  ( psql_run -c "set role authenticated; select set_config('request.jwt.claim.sub','$LIB',false); select (public.create_loan('$(bid 12)', '$(uid 11)', '$KEY')).id;" 2>/dev/null | tail -1 > "$TMP/c3_$i" ) &
done; wait
say "idempotência: $N cliques com a mesma chave criam 1 empréstimo só" \
  "$([ "$(psql_run -c "select count(*) from public.loans where book_id = '$(bid 12)' and user_id = '$(uid 11)'")" = 1 ] && echo 1 || echo 0)"
say "idempotência: todos os cliques recebem o mesmo empréstimo" "$([ "$(cat "$TMP"/c3_* | sort -u | grep -c .)" = 1 ] && echo 1 || echo 0)"

# 4) Sem chave, o mesmo par (pessoa, livro) em paralelo: o índice único deixa passar um só.
: > "$TMP/c4"
for i in $(seq 1 $N); do
  ( as_user "$LIB" "select public.create_loan('$(bid 11)', '$(uid 12)');" "$TMP/e4_$i" >> "$TMP/c4" ) &
done; wait
say "mesmo livro e mesma pessoa em paralelo: 1 empréstimo" "$([ "$(count_ok "$TMP/c4")" = 1 ] && echo 1 || echo 0)"

# 5) Devolução e empréstimo ao mesmo tempo, com uma pessoa na fila: o exemplar devolvido fica guardado para ela.
#    O livro 1 está com quem ganhou a corrida do cenário 1; o aluno 12 (que não disputou o cenário 1) entra na fila e os alunos 7 a 9 tentam furá-la.
HOLDER_LOAN="$(psql_run -c "select id from public.loans where book_id = '$(bid 1)' and returned_at is null")"
as_user "$(uid 12)" "select public.reserve_book('$(bid 1)');" "$TMP/e5r" >/dev/null
: > "$TMP/c5"
( as_user "$LIB" "select public.return_loan('$HOLDER_LOAN');" "$TMP/e5a" >> "$TMP/c5" ) &
for i in 7 8 9; do ( as_user "$LIB" "select public.create_loan('$(bid 1)', '$(uid "$i")');" "$TMP/e5_$i" >> "$TMP/c5" ) & done; wait
say "devolução x empréstimo: ninguém fura a fila (só quem reservou pode pegar)" \
  "$([ "$(psql_run -c "select count(*) from public.loans where book_id = '$(bid 1)' and returned_at is null and user_id in ('$(uid 7)','$(uid 8)','$(uid 9)')")" = 0 ] && echo 1 || echo 0)"
say "devolução x empréstimo: a reserva da fila ficou \"pronta\"" \
  "$([ "$(psql_run -c "select status from public.reservations where book_id = '$(bid 1)' and user_id = '$(uid 12)'")" = ready ] && echo 1 || echo 0)"
say "devolução x empréstimo: nunca passa do total de exemplares" \
  "$([ "$(psql_run -c "select count(*) from public.loans where book_id = '$(bid 1)' and returned_at is null")" -le 1 ] && echo 1 || echo 0)"

# 6) N reservas da mesma pessoa e do mesmo livro em paralelo (o livro 1 não tem exemplar livre): 1 reserva ativa.
: > "$TMP/c6"
for i in $(seq 1 $N); do ( as_user "$(uid 13)" "select public.reserve_book('$(bid 1)');" "$TMP/e6_$i" >> "$TMP/c6" ) & done; wait
say "reservas simultâneas da mesma pessoa: 1 só fica ativa" \
  "$([ "$(psql_run -c "select count(*) from public.reservations where book_id = '$(bid 1)' and user_id = '$(uid 13)' and status in ('waiting','ready')")" = 1 ] && echo 1 || echo 0)"

# Com DEBUG=1, mostra os erros recebidos pelas requisições (ajuda a entender uma falha).
if [ "${DEBUG:-0}" = 1 ]; then for f in "$TMP"/e5r "$TMP"/e6_1 "$TMP"/e5a; do echo "--- $(basename "$f"):"; cat "$f" 2>/dev/null | head -3; done; fi

# 7) Deadlock: o banco conta os que ocorreram (a ordem fixa de bloqueio das funções existe para ele ficar em zero).
DEAD="$(docker exec -i "$CONTAINER" psql -U postgres -X -q -t -A -c "select count(*) from pg_stat_database where datname = current_database() and deadlocks > 0")"
say "nenhum deadlock durante os cenários" "$([ "$DEAD" = 0 ] && echo 1 || echo 0)"

exit "$FAILED"
