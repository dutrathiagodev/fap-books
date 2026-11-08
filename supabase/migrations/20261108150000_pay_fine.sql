-- Migration: baixa manual do pagamento da multa (cards 0061 e 0093, RF-23).
-- O pagamento é presencial: a bibliotecária recebe no balcão e registra aqui. Não existe pagamento online.
-- Depende da migration 20261108100200 (claim_action_key e a coluna de auditoria usada por return_loan).
--
-- A baixa grava quem registrou (paid_by) e quando (paid_at) e libera a pessoa para novos empréstimos: create_loan e
-- renew_loan só bloqueiam multa com paid_at nulo.

-- Baixa: só a bibliotecária. Dar baixa de novo na mesma multa não faz nada (devolve a multa como está, mantendo o autor e a
-- data da primeira baixa e sem duplicar a auditoria). A chave de idempotência (uuid da tela) cobre o clique duplo e o retry.
-- A auditoria guarda só ids (LGPD): nunca nome, valor em texto ou e-mail.
create function public.pay_fine(p_fine_id uuid, p_idempotency_key uuid default null)
returns public.fines
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_fine public.fines;
begin
  if not public.is_librarian() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_idempotency_key is not null then
    if public.claim_action_key(v_actor, p_idempotency_key, 'pay_fine') is not null then
      select * into v_fine from public.fines f where f.id = p_fine_id;
      return v_fine;
    end if;
  end if;

  -- Trava a multa: a baixa e a tarefa diária de multas (que só mexe em multa em aberto) não se atropelam.
  select * into v_fine from public.fines f where f.id = p_fine_id for update;
  if not found then
    raise exception 'fine_not_found' using hint = 'Multa não encontrada.';
  end if;

  if v_fine.paid_at is not null then
    return v_fine;
  end if;

  update public.fines
  set paid_at = clock_timestamp(), paid_by = v_actor
  where id = p_fine_id
  returning * into v_fine;

  insert into public.audit_logs (actor_id, action, entity, entity_id, details)
  values (v_actor, 'fine_paid', 'fines', v_fine.id,
          jsonb_build_object('fine_id', v_fine.id, 'loan_id', v_fine.loan_id, 'user_id', v_fine.user_id));

  if p_idempotency_key is not null then
    update public.action_keys set entity_id = v_fine.id where actor_id = v_actor and key = p_idempotency_key;
  end if;
  return v_fine;
end;
$$;

revoke execute on function public.pay_fine(uuid, uuid) from public, anon;
grant execute on function public.pay_fine(uuid, uuid) to authenticated;
