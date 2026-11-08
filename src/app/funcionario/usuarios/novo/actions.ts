"use server";

import { parseUserForm, userFormErrors, type UserCreateResult } from "@/domain/users/user-form-rules";
import { requireRole } from "@/lib/require-role";
import { createUser } from "@/services/users.service";

// Só a funcionária cadastra usuário. Confere de novo quem está logado e as regras do formulário:
// o que veio do navegador nunca é confiável. Devolve só um motivo conhecido, nunca o erro bruto.
export async function createUserAction(input: unknown): Promise<UserCreateResult> {
  const profile = await requireRole("librarian");

  const values = parseUserForm(input);
  if (!values) return { ok: false, reason: "invalid", errors: {} };
  const errors = userFormErrors(values);
  if (Object.keys(errors).length > 0) return { ok: false, reason: "invalid", errors };

  try {
    return await createUser(values, profile.id);
  } catch {
    return { ok: false, reason: "error" };
  }
}
