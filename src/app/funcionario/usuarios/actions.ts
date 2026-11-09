"use server";

import { revalidatePath } from "next/cache";
import { USERS_PATH } from "@/domain/users/user-form-rules";
import { parseUserEdit, userEditErrors, validUserActionIds } from "@/domain/users/user-edit-rules";
import { requireRole } from "@/lib/require-role";
import { setUserActive, updateUser } from "@/services/users-admin.service";
import type { UserAdminResult } from "@/types/user-admin";

const INVALID: UserAdminResult = { ok: false, message: "Ação inválida. Atualize a tela e tente de novo.", final: true, code: null };

// Server Action é uma porta pública: confere de novo quem está logado (só a funcionária) e valida o que veio do navegador.
// O servidor decide; a tela só pede. O banco confere de novo (inclusive "não mexer em si mesma").
export async function updateUserAction(userId: string, input: unknown, idempotencyKey: string): Promise<UserAdminResult> {
  await requireRole("librarian");
  if (!validUserActionIds(userId, idempotencyKey)) return INVALID;

  const values = parseUserEdit(input);
  if (!values) return INVALID;
  if (Object.keys(userEditErrors(values)).length > 0) {
    return { ok: false, message: "Confira os campos destacados.", final: true, code: "invalid_fields" };
  }

  const result = await updateUser(userId, values, idempotencyKey);
  if (result.ok) revalidatePath(USERS_PATH);
  return result;
}

export async function setUserActiveAction(
  userId: string,
  active: unknown,
  confirmOpenLoans: unknown,
  idempotencyKey: string,
): Promise<UserAdminResult> {
  await requireRole("librarian");
  if (!validUserActionIds(userId, idempotencyKey)) return INVALID;
  if (typeof active !== "boolean" || typeof confirmOpenLoans !== "boolean") return INVALID;

  const result = await setUserActive(userId, active, confirmOpenLoans, idempotencyKey);
  if (result.ok) revalidatePath(USERS_PATH);
  return result;
}
