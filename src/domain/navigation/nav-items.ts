import { ACERVO_PATH, ROLE_HOME } from "../access/access-rules";

const USERS_PATH = "/funcionario/usuarios/novo";
const LOANS_PATH = "/funcionario/emprestimos";
const FINES_PATH = "/funcionario/multas";
const HISTORY_PATH = "/funcionario/historico";
import type { UserRole } from "@/types/profile";

export type NavKey =
  | "home"
  | "books"
  | "loans"
  | "reservations"
  | "pedagogical"
  | "fines"
  | "users"
  | "history"
  | "reports";

export interface NavItem {
  key: NavKey;
  label: string;
  // Sem href, a tela ainda não foi construída: o menu mostra o item desativado.
  href?: string;
}

// Itens do menu por perfil, na ordem do Figma (card 0101).
// Cada tela nova ganha o href quando o card dela for entregue. Sem item "Início": o endereço-base da área
// redireciona ao acervo (o Painel da bibliotecária volta ao menu com o card 0097).
export function navItemsFor(role: UserRole): NavItem[] {
  const home = ROLE_HOME[role];

  if (role === "librarian") {
    return [
      { key: "books", label: "Acervo", href: ACERVO_PATH },
      { key: "users", label: "Usuários", href: USERS_PATH },
      { key: "loans", label: "Empréstimos", href: LOANS_PATH },
      { key: "pedagogical", label: "Reservas pedagógicas" },
      { key: "fines", label: "Multas", href: FINES_PATH },
      { key: "history", label: "Histórico", href: HISTORY_PATH },
      { key: "reports", label: "Relatórios" },
    ];
  }

  const items: NavItem[] = [
    { key: "books", label: "Buscar livros", href: `${home}/livros` },
    { key: "loans", label: "Meus empréstimos" },
    { key: "reservations", label: "Minhas reservas" },
    { key: "fines", label: "Multas" },
  ];

  if (role === "teacher") items.push({ key: "pedagogical", label: "Reserva pedagógica" });
  return items;
}

// O item fica ativo na própria página e nas subpáginas dela.
export function isActive(item: NavItem, pathname: string) {
  if (!item.href) return false;
  // O início só fica ativo nele mesmo: as outras telas do perfil moram dentro do mesmo endereço-base.
  if (item.key === "home") return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
