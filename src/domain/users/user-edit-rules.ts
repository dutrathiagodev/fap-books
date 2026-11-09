import type { UserRole } from "@/types/profile";
import type { UserView } from "@/types/user-admin";
import { isUserRole, normalizePhone, userFormErrors, type UserFormErrors } from "./user-form-rules";
import { isUuid } from "../books/book-rules";

// Edição de usuário pela funcionária (card 0128). As regras de cada campo são as do cadastro (user-form-rules): aqui só
// entra o que é próprio da edição ("formando") e o que o e-mail NÃO faz (ele é a identidade do login e não muda).

export interface UserEditValues {
  role: UserRole;
  fullName: string;
  phone: string;
  registration: string;
  course: string;
  jobTitle: string;
  // Formando: limita o empréstimo a 4 livros (aluno, com a coluna profiles.graduating).
  graduating: boolean;
}

export type UserEditErrors = UserFormErrors;

// Valores iniciais do formulário, a partir da linha.
export function editValuesOf(user: UserView): UserEditValues {
  return {
    role: user.role,
    fullName: user.fullName,
    phone: user.phone,
    registration: user.registration,
    course: user.course,
    jobTitle: user.jobTitle,
    graduating: user.graduating,
  };
}

// Mesmas validações do cadastro (nome, telefone, matrícula, curso, cargo por perfil). Um e-mail de enchimento válido evita
// o erro do campo que esta tela não tem.
export function userEditErrors(values: UserEditValues): UserEditErrors {
  const errors = userFormErrors({ ...values, email: "ok@ok.ok" });
  delete errors.email;
  return errors;
}

// O que chega à Server Action é qualquer coisa: só segue se os campos tiverem o tipo certo.
export function parseUserEdit(input: unknown): UserEditValues | null {
  if (typeof input !== "object" || input === null) return null;
  const record = input as Record<string, unknown>;
  const { role, fullName, phone, registration, course, jobTitle, graduating } = record;
  if (!isUserRole(role)) return null;
  if ([fullName, phone, registration, course, jobTitle].some((value) => typeof value !== "string")) return null;
  if (typeof graduating !== "boolean") return null;
  return {
    role,
    fullName: fullName as string,
    phone: phone as string,
    registration: registration as string,
    course: course as string,
    jobTitle: jobTitle as string,
    graduating,
  };
}

// Argumentos de update_profile_admin. O banco confere tudo de novo e zera o que não é do perfil escolhido.
export function toUpdateArgs(userId: string, values: UserEditValues, idempotencyKey: string) {
  return {
    p_profile_id: userId,
    p_full_name: values.fullName.trim(),
    p_phone: normalizePhone(values.phone) || null,
    p_registration: values.registration.trim() || null,
    p_course: values.course.trim() || null,
    p_job_title: values.jobTitle.trim() || null,
    p_role: values.role,
    p_graduating: values.role === "student" && values.graduating,
    p_idempotency_key: idempotencyKey,
  };
}

// Confere os ids que vêm do navegador (usuário e chave de idempotência).
export function validUserActionIds(userId: unknown, key: unknown): boolean {
  return typeof userId === "string" && typeof key === "string" && isUuid(userId) && isUuid(key);
}
