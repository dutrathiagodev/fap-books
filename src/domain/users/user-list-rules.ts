import { cleanFineQuery } from "../fines/fine-rules";
import { USERS_PATH, USER_ROLE_LABELS, isUserRole } from "./user-form-rules";
import type { UserFilters, UserRoleFilter, UserStatusFilter } from "../../types/user-admin";

// Filtros do endereço da tela de usuários (?perfil=, ?situacao=, ?q= e ?pagina=). Tudo o que vem do endereço é dado do
// navegador: valor desconhecido cai no padrão (todos, sem busca, página 1).

const STATUSES: readonly UserStatusFilter[] = ["all", "active", "inactive"];
const MAX_PAGE = 10000;

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export const ROLE_FILTER_LABELS: Record<UserRoleFilter, string> = {
  all: "Todos",
  student: "Alunos",
  teacher: "Professores",
  librarian: "Funcionários",
};

export const STATUS_FILTER_LABELS: Record<UserStatusFilter, string> = { all: "Todos", active: "Ativos", inactive: "Inativos" };

export const ROLE_FILTER_ORDER: readonly UserRoleFilter[] = ["all", "student", "teacher", "librarian"];
export const STATUS_FILTER_ORDER: readonly UserStatusFilter[] = ["all", "active", "inactive"];

export function parseUserFilters(params: RawParams): UserFilters {
  const role = first(params.perfil);
  const status = first(params.situacao);
  const page = Number.parseInt(first(params.pagina), 10);
  return {
    role: isUserRole(role) ? role : "all",
    status: (STATUSES as readonly string[]).includes(status) ? (status as UserStatusFilter) : "all",
    // Mesma limpeza da busca das multas: sem caracteres de controle nem "*", espaços juntos, no máximo 60 letras.
    query: cleanFineQuery(first(params.q)),
    page: Number.isInteger(page) && page > 0 ? Math.min(page, MAX_PAGE) : 1,
  };
}

// Endereço da tela com os filtros. O padrão (todos, sem busca, página 1) não aparece no endereço.
export function userHref(filters: Partial<UserFilters>): string {
  const search = new URLSearchParams();
  if (filters.query) search.set("q", filters.query);
  if (filters.role && filters.role !== "all") search.set("perfil", filters.role);
  if (filters.status && filters.status !== "all") search.set("situacao", filters.status);
  if (filters.page && filters.page > 1) search.set("pagina", String(filters.page));
  const text = search.toString();
  return text ? `${USERS_PATH}?${text}` : USERS_PATH;
}

// "Mostrando 1-6 de 240 usuários"
export function userSummary(first: number, last: number, total: number): string {
  if (total === 0) return "Nenhum usuário";
  return `Mostrando ${first}-${last} de ${total} ${total === 1 ? "usuário" : "usuários"}`;
}

// Texto do vazio: sem ninguém cadastrado, convida a cadastrar; com busca ou filtro, ajuda a achar (Figma, estados).
export function userEmptyTexts(hasFilter: boolean): { title: string; description: string } {
  return hasFilter
    ? { title: "Nenhum usuário encontrado", description: "Tente outro nome ou limpe os filtros." }
    : { title: "Nenhum usuário cadastrado", description: "Cadastre o primeiro usuário para começar." };
}

// Rótulo de perfil do chip ou da etiqueta.
export function roleLabel(role: UserRoleFilter): string {
  return role === "all" ? ROLE_FILTER_LABELS.all : USER_ROLE_LABELS[role];
}
