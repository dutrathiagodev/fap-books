-- Migration: renovar também é recusado com multa em aberto (Área do aluno, card 0215).
-- Antes só o atraso, as reservas de outras pessoas e o limite de renovações bloqueavam; a tela já avisava da multa, mas o
-- banco não recusava. Agora a regra vale no banco, para o aluno e para a bibliotecária. As migrations anteriores já foram
-- aplicadas e não mudam: esta substitui a função inteira, igual à anterior mais a conferência da multa.

create or replace function public.renew_loan(p_loan_id uuid, p_idempotency_key uuid default null)
returns public.loans
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_loan public.loans;
  v_book_id uuid;
  v_now timestamptz;
begin
  if p_idempotency_key is not null then
    if public.claim_action_key(v_actor, p_idempotency_key, 'renew_loan') is not null then
      select * into v_loan from public.loans where id = p_loan_id;
      return v_loan;
    end if;
  end if;

  select l.book_id into v_book_id from public.loans l where l.id = p_loan_id;
  if not found then
    raise exception 'loan_not_found' using hint = 'Empréstimo não encontrado.';
  end if;
  perform 1 from public.books b where b.id = v_book_id for update;
  select * into v_loan from public.loans l where l.id = p_loan_id for update;

  if not (public.is_librarian() or (v_loan.user_id = v_actor
          and exists (select 1 from public.profiles p where p.id = v_actor and p.active))) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_loan.returned_at is not null then
    raise exception 'loan_already_returned' using hint = 'Este empréstimo já foi devolvido.';
  end if;

  v_now := clock_timestamp();
  if v_loan.due_at < v_now then
    raise exception 'loan_overdue' using hint = 'Empréstimo vencido não pode ser renovado: devolva o livro.';
  end if;
  if exists (select 1 from public.reservations r
             where r.book_id = v_loan.book_id and r.user_id <> v_loan.user_id and r.status in ('waiting', 'ready')) then
    raise exception 'book_has_reservations' using hint = 'Outra pessoa reservou este livro.';
  end if;

  -- Multa em aberto (devolução atrasada anterior) também bloqueia, como no empréstimo novo (create_loan).
  if exists (select 1 from public.fines f where f.user_id = v_loan.user_id and f.paid_at is null) then
    raise exception 'user_has_pending' using hint = 'A pessoa tem multa em aberto.';
  end if;

  if v_loan.renewals >= public.max_renewals() then
    raise exception 'renewal_limit_reached' using hint = 'Este empréstimo já foi renovado 3 vezes.';
  end if;

  update public.loans
  set due_at = v_loan.due_at + make_interval(days => public.loan_period_days()),
      renewals = renewals + 1
  where id = p_loan_id
  returning * into v_loan;

  insert into public.audit_logs (actor_id, action, entity, entity_id, details)
  values (v_actor, 'loan_renewed', 'loans', v_loan.id,
          jsonb_build_object('loan_id', v_loan.id, 'book_id', v_loan.book_id, 'user_id', v_loan.user_id));

  if p_idempotency_key is not null then
    update public.action_keys set entity_id = v_loan.id where actor_id = v_actor and key = p_idempotency_key;
  end if;
  return v_loan;
end;
$$;

revoke execute on function public.renew_loan(uuid, uuid) from public, anon;
grant execute on function public.renew_loan(uuid, uuid) to authenticated;
