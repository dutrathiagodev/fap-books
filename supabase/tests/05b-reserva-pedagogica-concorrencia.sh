#!/usr/bin/env bash
# Corrida entre APROVAR uma reserva pedagógica e EMPRESTAR o mesmo (único) exemplar, várias conexões ao mesmo tempo.
# Esperado em toda rodada: ou 1 empréstimo e a reserva segue "pending" (aprovação recusada), ou 0 empréstimos e a reserva
# "approved". Nunca os dois. Uso (banco de teste novo com o simulador e TODAS as migrations; NUNCA no banco real):
#   supabase/tests/05b-reserva-pedagogica-concorrencia.sh fapdb
set -u
C="${1:?Informe o nome do container do Postgres de teste}"
P() { docker exec -i "$C" psql -U postgres -X -q -t -A -v ON_ERROR_STOP=1 "$@"; }
FAILED=0
P -c "insert into auth.users (id,email,raw_user_meta_data) select ('00000000-0000-0000-0000-0000000d'||lpad(i::text,4,'0'))::uuid, 'cc'||i||'@x.com','{\"full_name\":\"CC\"}' from generate_series(1,6) i on conflict do nothing; update public.profiles set role='librarian' where id='00000000-0000-0000-0000-0000000d0001'; update public.profiles set role='teacher' where id='00000000-0000-0000-0000-0000000d0002';"
for round in 1 2 3 4 5 6 7 8; do
  B="b0000000-0000-0000-0000-00000000f00$round"; R="c0000000-0000-0000-0000-00000000f00$round"
  P -c "insert into public.books (id,title,author,code,quantity) values ('$B','CC','A','CF-$round',1); insert into public.pedagogical_reservations (id,teacher_id,start_date,days,created_by) values ('$R','00000000-0000-0000-0000-0000000d0002',current_date+1,5,'00000000-0000-0000-0000-0000000d0002'); insert into public.pedagogical_reservation_books values ('$R','$B');" >/dev/null
  for u in 3 4 5 6; do P -c "set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000d0001',false); select public.create_loan('$B','00000000-0000-0000-0000-0000000d000$u')" >/dev/null 2>&1 & done
  P -c "set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000d0001',false); select public.decide_pedagogical_reservation('$R', true)" >/dev/null 2>&1 &
  wait
  loans=$(P -c "select count(*) from public.loans where book_id='$B'"); st=$(P -c "select status from public.pedagogical_reservations where id='$R'")
  if { [ "$loans" = 1 ] && [ "$st" = pending ]; } || { [ "$loans" = 0 ] && [ "$st" = approved ]; }; then echo "PASS  rodada $round: empréstimos=$loans reserva=$st"; else echo "FAIL  rodada $round: empréstimos=$loans reserva=$st"; FAILED=1; fi
done
exit $FAILED
