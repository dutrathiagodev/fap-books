-- Migration: edição e inativação de usuários pela funcionária (cards 0088, 0127 e 0128; RF-09).
-- Depende das migrations 20261104120100 (matrícula e curso), 20261108100200 (claim_action_key, graduating e reservas)
-- e 20261108120000 (telefone).
--
-- Duas funções para a funcionária:
--   update_profile_admin  edita nome, telefone, matrícula, curso, cargo, perfil e "formando".
--                         O e-mail NÃO muda aqui: ele é a identidade do login (auth.users).
--   set_profile_active    inativa ou reativa. Inativar impede novos empréstimos, derruba o acesso (o proxy trata
--                         perfil inativo como não logado) e mantém todo o histórico.
-- Regras no banco (a tela só pede): a funcionária não muda o próprio perfil nem a própria situação; inativar quem tem
-- empréstimo em aberto exige confirmação explícita (p_confirm_open_loans); a auditoria guarda só ids (LGPD).

-- Novas ações de auditoria (a lista é a da migration 20261104120300 mais as duas de situação).
alter table public.audit_logs
  drop constraint audit_logs_action_known;

alter table public.audit_logs
  add constraint audit_logs_action_known check (action in (
    'loan_created', 'loan_returned', 'loan_renewed',
    'reservation_created', 'reservation_cancelled', 'reservation_approved', 'reservation_rejected',
    'pedagogical_requested', 'pedagogical_approved', 'pedagogical_rejected', 'pedagogical_returned',
    'fine_created', 'fine_paid',
    'book_created', 'book_updated', 'book_inactivated', 'book_deleted',
    'profile_created', 'profile_updated', 'profile_viewed', 'profile_inactivated', 'profile_reactivated'
  )) not valid;

-- ---------------------------------------------------------------------------------------------------------------------
-- Edição
-- ---------------------------------------------------------------------------------------------------------------------

-- Devolve o perfil já atualizado. Campos que não pertencem ao perfil escolhido são gravados como nulos (como no cadastro):
-- matrícula e curso só de aluno, cargo só de funcionário, "formando" só de aluno.
-- A chave de idempotência (uuid da tela) cobre o clique duplo e a nova tentativa depois de falha de rede.
create function public.update_profile_admin(
  p_profile_id uuid,
  p_full_name text,
  p_phone text,
  p_registration text,
  p_course text,
  p_job_title text,
  p_role public.user_role,
  p_graduating boolean,
  p_idempotency_key uuid default null
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_profile public.profiles;
  v_previous uuid;
  v_name text := btrim(coalesce(p_full_name, ''));
  v_phone text := nullif(btrim(coalesce(p_phone, '')), '');
  v_registration text := nullif(btrim(coalesce(p_registration, '')), '');
  v_course text := nullif(btrim(coalesce(p_course, '')), '');
  v_job_title text := nullif(btrim(coalesce(p_job_title, '')), '');
begin
  if not public.is_librarian() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_idempotency_key is not null then
    v_previous := public.claim_action_key(v_actor, p_idempotency_key, 'update_profile');
    if v_previous is not null then
      select * into v_profile from public.profiles p where p.id = v_previous;
      return v_profile;
    end if;
  end if;

  -- Trava o perfil: a edição, um empréstimo e uma inativação ao mesmo tempo não se atropelam.
  select * into v_profile from public.profiles p where p.id = p_profile_id for no key update;
  if not found then
    raise exception 'profile_not_found' using hint = 'Usuário não encontrado.';
  end if;

  if p_role is null then
    raise exception 'invalid_role' using hint = 'Escolha o perfil.';
  end if;
  -- Quem se promove ou se rebaixa por engano pode perder o acesso de funcionária: só outra funcionária muda o perfil.
  if p_profile_id = v_actor and p_role <> v_profile.role then
    raise exception 'cannot_change_own_role' using hint = 'Você não pode mudar o seu próprio perfil.';
  end if;

  if char_length(v_name) not between 3 and 120 then
    raise exception 'invalid_name' using hint = 'Informe o nome completo.';
  end if;
  if v_phone is not null and v_phone !~ '^[0-9]{10,11}$' then
    raise exception 'invalid_phone' using hint = 'Use o telefone com DDD, só números.';
  end if;

  if p_role = 'student' then
    if v_registration is null or v_registration !~ '^[0-9]{5,8}$' then
      raise exception 'invalid_registration' using hint = 'A matrícula tem de 5 a 8 números.';
    end if;
    if v_course is null or char_length(v_course) not between 2 and 80 then
      raise exception 'invalid_course' using hint = 'Informe o curso.';
    end if;
  else
    v_registration := null;
    v_course := null;
  end if;

  if p_role = 'librarian' then
    if v_job_title is null or char_length(v_job_title) not between 2 and 80 then
      raise exception 'job_title_required' using hint = 'Informe o cargo.';
    end if;
  else
    v_job_title := null;
  end if;

  begin
    update public.profiles
    set full_name = v_name, phone = v_phone, registration = v_registration, course = v_course,
        job_title = v_job_title, role = p_role, graduating = (p_role = 'student' and coalesce(p_graduating, false))
    where id = p_profile_id
    returning * into v_profile;
  exception when unique_violation then
    raise exception 'registration_taken' using hint = 'Já existe um usuário com essa matrícula.';
  end;

  insert into public.audit_logs (actor_id, action, entity, entity_id, details)
  values (v_actor, 'profile_updated', 'profiles', v_profile.id, jsonb_build_object('profile_id', v_profile.id));

  if p_idempotency_key is not null then
    update public.action_keys set entity_id = v_profile.id where actor_id = v_actor and key = p_idempotency_key;
  end if;
  return v_profile;
end;
$$;

-- ---------------------------------------------------------------------------------------------------------------------
-- Inativação e reativação
-- ---------------------------------------------------------------------------------------------------------------------

-- Inativar: a pessoa não pega livros e não entra mais no sistema; empréstimos abertos continuam valendo e podem ser
-- devolvidos no balcão (a devolução não depende de a pessoa estar ativa), então o histórico e as multas seguem corretos.
-- Com empréstimo em aberto a função recusa (has_open_loans) até a tela mandar p_confirm_open_loans = true, depois do aviso.
-- As reservas em fila ou prontas são canceladas, para o exemplar guardado voltar a quem está esperando.
-- Reativar só volta a situação para ativo. Repetir a mesma situação não faz nada (e não duplica a auditoria).
create function public.set_profile_active(
  p_profile_id uuid,
  p_active boolean,
  p_confirm_open_loans boolean default false,
  p_idempotency_key uuid default null
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_profile public.profiles;
  v_previous uuid;
  v_open integer;
  v_book uuid;
  v_reservation record;
begin
  if not public.is_librarian() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_active is null then
    raise exception 'invalid_status' using hint = 'Situação inválida.';
  end if;

  if p_idempotency_key is not null then
    v_previous := public.claim_action_key(v_actor, p_idempotency_key, 'set_profile_active');
    if v_previous is not null then
      select * into v_profile from public.profiles p where p.id = v_previous;
      return v_profile;
    end if;
  end if;

  -- Mesma ordem de bloqueio de create_loan: primeiro a pessoa, depois os livros.
  select * into v_profile from public.profiles p where p.id = p_profile_id for no key update;
  if not found then
    raise exception 'profile_not_found' using hint = 'Usuário não encontrado.';
  end if;

  if p_profile_id = v_actor then
    raise exception 'cannot_change_own_status' using hint = 'Você não pode inativar a si mesma.';
  end if;

  if v_profile.active = p_active then
    return v_profile;
  end if;

  if not p_active then
    select count(*) into v_open from public.loans l where l.user_id = p_profile_id and l.returned_at is null;
    if v_open > 0 and not coalesce(p_confirm_open_loans, false) then
      raise exception 'has_open_loans' using hint = format('Esta pessoa tem %s empréstimo(s) em aberto.', v_open);
    end if;
  end if;

  update public.profiles set active = p_active where id = p_profile_id returning * into v_profile;

  if not p_active then
    -- Um livro por vez, travado antes de mexer nas reservas dele; depois promove a fila.
    for v_book in
      select distinct r.book_id from public.reservations r
      where r.user_id = p_profile_id and r.status in ('waiting', 'ready')
      order by r.book_id
    loop
      perform 1 from public.books b where b.id = v_book for update;
      for v_reservation in
        select r.id from public.reservations r
        where r.user_id = p_profile_id and r.book_id = v_book and r.status in ('waiting', 'ready')
        for update
      loop
        update public.reservations set status = 'cancelled' where id = v_reservation.id;
        insert into public.audit_logs (actor_id, action, entity, entity_id, details)
        values (v_actor, 'reservation_cancelled', 'reservations', v_reservation.id,
                jsonb_build_object('reservation_id', v_reservation.id, 'book_id', v_book, 'user_id', p_profile_id));
      end loop;
      perform public.promote_reservations(v_book);
    end loop;
  end if;

  insert into public.audit_logs (actor_id, action, entity, entity_id, details)
  values (v_actor, case when p_active then 'profile_reactivated' else 'profile_inactivated' end, 'profiles', v_profile.id,
          jsonb_build_object('profile_id', v_profile.id));

  if p_idempotency_key is not null then
    update public.action_keys set entity_id = v_profile.id where actor_id = v_actor and key = p_idempotency_key;
  end if;
  return v_profile;
end;
$$;

revoke execute on function public.update_profile_admin(uuid, text, text, text, text, text, public.user_role, boolean, uuid) from public, anon;
revoke execute on function public.set_profile_active(uuid, boolean, boolean, uuid) from public, anon;
grant execute on function public.update_profile_admin(uuid, text, text, text, text, text, public.user_role, boolean, uuid) to authenticated;
grant execute on function public.set_profile_active(uuid, boolean, boolean, uuid) to authenticated;
