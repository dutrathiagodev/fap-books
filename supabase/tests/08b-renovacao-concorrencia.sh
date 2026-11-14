#!/usr/bin/env bash
# Corridas da renovação da reserva pedagógica (várias conexões ao mesmo tempo):
#  1. 4 pedidos de renovação da mesma reserva ao mesmo tempo: sobra exatamente 1 pendente, os outros recebem
#     renewal_already_pending (nenhum erro de índice ou deadlock).
#  2. aprovar a renovação ao mesmo tempo que a funcionária devolve a reserva original: sem deadlock e nunca uma
#     renovação "aprovada" ou "pendente" ligada a uma original já devolvida; se aprovou antes, a original foi estendida.
# Uso (banco de teste novo com o simulador e TODAS as migrations; NUNCA no banco real):
#   supabase/tests/08b-renovacao-concorrencia.sh fapdb   (DB=nome troca o banco dentro do container; padrão: postgres)
set -u
C="${1:?Informe o nome do container do Postgres de teste}"
P() { docker exec -i "$C" psql -U postgres -d "${DB:-postgres}" -X -q -t -A -v ON_ERROR_STOP=1 "$@"; }
LIB='00000000-0000-0000-0000-0000000f0001'; TEA='00000000-0000-0000-0000-0000000f0002'
AS() { echo "set role authenticated; select set_config('request.jwt.claim.sub','$1',false);"; }
FAILED=0
P -c "insert into auth.users (id,email,raw_user_meta_data) values ('$LIB','rc1@x.com','{\"full_name\":\"RC\"}'),('$TEA','rc2@x.com','{\"full_name\":\"RC\"}') on conflict do nothing; update public.profiles set role='librarian' where id='$LIB'; update public.profiles set role='teacher' where id='$TEA';"
for round in 1 2 3 4 5 6; do
  B="b0000000-0000-0000-0000-00000000f10$round"
  RES=$(P -c "insert into public.books (id,title,author,code,quantity) values ('$B','RC','A','RC-$round',1); $(AS "$TEA") select id from public.request_pedagogical_reservation(array['$B']::uuid[], current_date + 1, 10)" | tail -1)
  P -c "$(AS "$LIB") select public.decide_pedagogical_reservation('$RES', true); reset role; update public.pedagogical_reservations set start_date = current_date - 5 where id = '$RES'" >/dev/null
  for i in 1 2 3 4; do P -c "$(AS "$TEA") select public.request_pedagogical_renewal('$RES', 5)" >"/tmp/rc-$round-$i.out" 2>&1 & done
  wait
  pending=$(P -c "select count(*) from public.pedagogical_reservations where renewal_of='$RES' and status='pending'")
  bad=0; for f in /tmp/rc-$round-*.out; do grep -q 'ERROR' "$f" && ! grep -q 'renewal_already_pending' "$f" && bad=$((bad+1)); done
  [ "$bad" = 0 ] && rm -f /tmp/rc-$round-*.out
  REN=$(P -c "select id from public.pedagogical_reservations where renewal_of='$RES' and status='pending'")
  P -c "$(AS "$LIB") select public.decide_pedagogical_reservation('$REN', true)" >"/tmp/rd-$round-1.out" 2>&1 &
  P -c "$(AS "$LIB") select public.return_pedagogical_reservation('$RES')" >"/tmp/rd-$round-2.out" 2>&1 &
  wait
  dead=$(cat /tmp/rd-$round-*.out | grep -ci 'deadlock')
  orig=$(P -c "select status || ':' || days from public.pedagogical_reservations where id='$RES'")
  ren=$(P -c "select status from public.pedagogical_reservations where id='$REN'")
  held=$(P -c "select count(*) from public.pedagogical_reservations r join public.pedagogical_reservation_books b on b.reservation_id = r.id where b.book_id='$B' and r.status = 'approved'")
  ok=1
  [ "$pending" = 1 ] || ok=0; [ "$bad" = 0 ] || ok=0; [ "$dead" = 0 ] || ok=0
  case "$orig/$ren" in
    # A devolução sempre vence no fim: se aprovou antes (dias 15, original estendida) a renovação virou "returned"; se
    # devolveu antes, a pendente virou "cancelled". Qualquer outra combinação é falha.
    returned:15/returned|returned:10/cancelled) ;;
    *) ok=0 ;;
  esac
  [ "$held" -le 1 ] || ok=0
  if [ "$ok" = 1 ]; then echo "PASS  rodada $round: pendentes=$pending original=$orig renovação=$ren"; else echo "FAIL  rodada $round: pendentes=$pending erros=$bad deadlock=$dead original=$orig renovação=$ren guardados=$held"; FAILED=1; fi
  rm -f /tmp/rd-$round-*.out
done
exit $FAILED
