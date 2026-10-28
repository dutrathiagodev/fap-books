import { ROLE_HOME } from "../access/access-rules";
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
// Cada tela nova ganha o href quando o card dela for entregue.
export function navItemsFor(role: UserRole): NavItem[] {
  const home = ROLE_HOME[role];

  if (role === "librarian") {
    return [
      { key: "home", label: "Painel", href: home },
      { key: "books", label: "Acervo", href: "/funcionario/acervo" },
      { key: "users", label: "Usuários" },
      { key: "loans", label: "Empréstimos" },
      { key: "pedagogical", label: "Reservas pedagógicas" },
      { key: "fines", label: "Multas" },
      { key: "history", label: "Histórico" },
      { key: "reports", label: "Relatórios" },
    ];
  }

  const items: NavItem[] = [
    { key: "home", label: "Início", href: home },
    { key: "books", label: "Buscar livros" },
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
