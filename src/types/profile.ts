// Os três perfis do sistema (iguais ao enum user_role do banco).
export type UserRole = "student" | "teacher" | "librarian";

export interface Profile {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
}
