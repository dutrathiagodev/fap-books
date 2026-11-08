import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { normalizeEmail, toProfileRow, type UserCreateResult, type UserFormValues } from "@/domain/users/user-form-rules";
import type { UserRole } from "@/types/profile";
import { UNIQUE_VIOLATION } from "./postgres-codes";

// Cadastro de usuário pela bibliotecária (cards 0029, 0030, 0031): convite por e-mail, a pessoa define a própria senha
// (decisão de 26/10 em docs/database/modelo-de-dados.md). A senha nunca passa por aqui.
// Quem chama já conferiu que a pessoa logada é funcionária (requireRole); o RLS confere de novo na gravação do perfil.
//
// Passos: 1) a matrícula livre; 2) o convite cria a conta de login e o banco cria o perfil como aluno;
// 3) a bibliotecária ajusta o perfil (papel, telefone, matrícula, curso, cargo); 4) auditoria.
// Se o passo 3 falhar, o convite é desfeito para não sobrar uma conta com o perfil errado.
//
// LGPD: erro, e-mail, telefone e matrícula nunca vão para o log; só o código do erro.
export async function createUser(
  values: UserFormValues & { role: UserRole },
  actorId: string,
): Promise<UserCreateResult> {
  const supabase = await createSupabaseServerClient();
  const row = toProfileRow(values);

  if (row.registration) {
    const taken = await supabase.from("profiles").select("id").eq("registration", row.registration).maybeSingle();
    if (taken.error) return { ok: false, reason: "error" };
    if (taken.data) return { ok: false, reason: "duplicate_registration" };
  }

  const admin = createSupabaseAdminClient();
  const invited = await admin.auth.admin.inviteUserByEmail(normalizeEmail(values.email), {
    data: { full_name: row.full_name },
  });
  if (invited.error || !invited.data.user) {
    const code = invited.error?.code;
    console.error("Falha ao convidar o usuário:", code ?? "sem código");
    if (code === "email_exists") return { ok: false, reason: "duplicate_email" };
    if (code === "over_email_send_rate_limit") return { ok: false, reason: "rate_limit" };
    return { ok: false, reason: "error" };
  }
  const userId = invited.data.user.id;

  const updated = await supabase.from("profiles").update(row).eq("id", userId).select("id");
  if (updated.error || updated.data.length !== 1) {
    console.error("Falha ao gravar o perfil do usuário novo:", updated.error?.code ?? "perfil não encontrado");
    const undone = await admin.auth.admin.deleteUser(userId);
    if (undone.error) console.error("Falha ao desfazer o convite:", undone.error.code ?? "sem código");
    return { ok: false, reason: updated.error?.code === UNIQUE_VIOLATION ? "duplicate_registration" : "error" };
  }

  // O banco só aceita "details" com ids (LGPD). Se a gravação falhar, o cadastro já feito não é desfeito.
  const audit = await supabase.from("audit_logs").insert({
    actor_id: actorId,
    action: "profile_created",
    entity: "profiles",
    entity_id: userId,
    details: { profile_id: userId },
  });
  if (audit.error) console.error("Falha ao gravar a auditoria:", audit.error.code ?? "sem código");

  return { ok: true };
}
