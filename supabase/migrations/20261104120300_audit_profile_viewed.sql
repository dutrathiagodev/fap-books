-- Auditoria da consulta de usuário no balcão (card 0130, LGPD).
-- Cada perfil que aparece numa consulta da bibliotecária vira um registro "profile_viewed" (quem viu quem, e quando).
-- O "details" continua só com ids (profile_id), como exige audit_logs_details_only_ids.
-- Só troca a lista de ações conhecidas; a política de gravação (só a bibliotecária grava ações fora das reservas) não muda.

alter table public.audit_logs
  drop constraint audit_logs_action_known;

alter table public.audit_logs
  add constraint audit_logs_action_known check (action in (
    'loan_created', 'loan_returned', 'loan_renewed',
    'reservation_created', 'reservation_cancelled', 'reservation_approved', 'reservation_rejected',
    'pedagogical_requested', 'pedagogical_approved', 'pedagogical_rejected', 'pedagogical_returned',
    'fine_created', 'fine_paid',
    'book_created', 'book_updated', 'book_inactivated', 'book_deleted',
    'profile_created', 'profile_updated', 'profile_viewed'
  )) not valid;
