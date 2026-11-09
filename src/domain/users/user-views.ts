import { initialsOf } from "../loans/loan-lookup-rules";
import { USER_ROLE_LABELS } from "./user-form-rules";
import type { UserRole } from "../../types/profile";
import type { UserView } from "../../types/user-admin";

// Uma linha do banco: o perfil como a lista lê.
export interface UserRow {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  active: boolean;
  phone: string | null;
  registration: string | null;
  course: string | null;
  job_title: string | null;
  graduating: boolean;
}

// Monta a linha da tela. Matrícula (aluno) ou cargo (funcionário) vão como detalhe do perfil.
export function toUserView(row: UserRow, openLoans: number, selfId: string): UserView {
  return {
    id: row.id,
    fullName: row.full_name,
    initials: initialsOf(row.full_name),
    email: row.email,
    role: row.role,
    roleLabel: USER_ROLE_LABELS[row.role],
    detail: row.role === "librarian" ? row.job_title : row.role === "student" ? row.registration : null,
    active: row.active,
    openLoans,
    phone: row.phone ?? "",
    registration: row.registration ?? "",
    course: row.course ?? "",
    jobTitle: row.job_title ?? "",
    graduating: row.graduating,
    isSelf: row.id === selfId,
  };
}
