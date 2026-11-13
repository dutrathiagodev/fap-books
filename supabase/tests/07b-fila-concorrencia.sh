#!/usr/bin/env bash
# Corrida pelo ÚLTIMO exemplar da fila: o livro está emprestado e, ao mesmo tempo, 5 pessoas pedem reserva e a funcionária
# registra a devolução. Em toda rodada: no máximo 1 reserva "pronta" (só há 1 exemplar), nenhuma pessoa duplicada, e nunca
# sobra exemplar livre com gente esperando (ou há 1 pronta, ou o exemplar ainda está emprestado). Cada pedido termina ok
# ou com book_available (a devolução chegou antes e o exemplar está livre: é para emprestar, não reservar).
# Uso (banco de teste novo com o simulador e TODAS as migrations; NUNCA no banco real):
#   supabase/tests/07b-fila-concorrencia.sh fapdb   (DB=nome troca o banco dentro do container; padrão: postgres)
set -u
C="${1:?Informe o nome do container do Postgres de teste}"
P() { docker exec -i "$C" psql -U postgres -d "${DB:-postgres}" -X -q -t -A -v ON_ERROR_STOP=1 "$@"; }
U() { printf '00000000-0000-0000-0000-0000000e%04d' "$1"; }
FAILED=0
P -c "insert into auth.users (id,email,raw_user_meta_data) select ('00000000-0000-0000-0000-0000000e'||lpad(i::text,4,'0'))::uuid, 'fq'||i||'@x.com','{\"full_name\":\"FQ\"}' from generate_series(1,8) i on conflict do nothing; update public.profiles set role='librarian' where id='$(U 1)';"
AS() { echo "set role authenticated; select set_config('request.jwt.claim.sub','$1',false);"; }
for round in 1 2 3 4 5 6 7 8; do
  B="b0000000-0000-0000-0000-00000000e00$round"
  LOAN=$(P -c "insert into public.books (id,title,author,code,quantity) values ('$B','FQ','A','FQ-$round',1); $(AS "$(U 1)") select id from public.create_loan('$B','$(U 2)')" | tail -1)
  for u in 3 4 5 6 7; do P -c "$(AS "$(U $u)") select public.reserve_book('$B')" >"/tmp/fq-$round-$u.out" 2>&1 & done
  P -c "$(AS "$(U 1)") select public.return_loan('$LOAN')" >/dev/null 2>&1 &
  wait
  ready=$(P -c "select count(*) from public.reservations where book_id='$B' and status='ready'")
  waiting=$(P -c "select count(*) from public.reservations where book_id='$B' and status='waiting'")
  dup=$(P -c "select count(*) from (select user_id from public.reservations where book_id='$B' group by 1 having count(*)>1) d")
  open=$(P -c "select count(*) from public.loans where book_id='$B' and returned_at is null")
  # Erro que não seja book_available (devolução chegou antes) é falha: deadlock, violação de índice etc.
  bad=0; for f in /tmp/fq-$round-*.out; do grep -q 'ERROR' "$f" && ! grep -q 'book_available' "$f" && bad=$((bad+1)); done
  [ "$bad" = 0 ] && rm -f /tmp/fq-$round-*.out
  if [ "$ready" -le 1 ] && [ "$dup" = 0 ] && [ "$open" = 0 ] && { [ "$waiting" = 0 ] || [ "$ready" = 1 ]; } && [ "$bad" = 0 ]; then
    echo "PASS  rodada $round: prontas=$ready esperando=$waiting"
  else
    echo "FAIL  rodada $round: prontas=$ready esperando=$waiting duplicadas=$dup emprestados=$open erros=$bad"; FAILED=1
  fi
done
exit $FAILED
