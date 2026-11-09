import type { UserRole } from "./profile";

// Tipos da tela de usuários da funcionária (Figma, cards 0126 a 0128).

// Chips de perfil e de situação. "all" = sem filtro.
export type UserRoleFilter = "all" | UserRole;
export type UserStatusFilter = "all" | "active" | "inactive";

export interface UserFilters {
  role: UserRoleFilter;
  status: UserStatusFilter;
  // Busca por nome, e-mail ou matrícula.
  query: string;
  page: number;
}

// Uma linha da lista, já pronta para desenhar.
export interface UserView {
  id: string;
  fullName: string;
  initials: string;
  email: string;
  role: UserRole;
  roleLabel: string;
  // Matrícula (aluno), cargo (funcionário) ou nulo.
  detail: string | null;
  active: boolean;
  openLoans: number;
  // Campos que o modal de edição preenche (o telefone vem só com números).
  phone: string;
  registration: string;
  course: string;
  jobTitle: string;
  graduating: boolean;
  // É a própria funcionária logada: não pode inativar nem mudar o próprio perfil.
  isSelf: boolean;
}

export interface UserCounts {
  // Contagens dos chips de perfil (respeitam a busca e a situação escolhida) e de situação (respeitam a busca e o perfil).
  byRole: Record<UserRoleFilter, number>;
  byStatus: Record<UserStatusFilter, number>;
}

export interface UserList {
  users: UserView[];
  counts: UserCounts;
  total: number;
  page: number;
  pages: number;
  pageSize: number;
}

// "final": erro de regra (repetir não adianta; a tela descarta a chave de idempotência). Sem "final" é falha passageira.
// "code": o código conhecido do banco, para a tela reagir (ex.: has_open_loans abre o aviso de confirmação).
export type UserAdminResult = { ok: true } | { ok: false; message: string; final: boolean; code: string | null };
