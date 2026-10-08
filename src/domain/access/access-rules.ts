import type { UserRole } from "@/types/profile";

// Cada perfil tem a sua área. Quem não é da área volta para a própria.
export const ROLE_HOME: Record<UserRole, string> = {
  student: "/aluno",
  teacher: "/professor",
  librarian: "/funcionario",
};

export const LOGIN_PATH = "/login";

export type RouteDecision =
  | { action: "allow" }
  | { action: "redirect"; to: string };

function isInside(pathname: string, area: string) {
  return pathname === area || pathname.startsWith(`${area}/`);
}

// Decide o que fazer com o endereço pedido. role é null quando a pessoa não está logada.
export function decideRoute(pathname: string, role: UserRole | null): RouteDecision {
  if (role === null) {
    return pathname === LOGIN_PATH
      ? { action: "allow" }
      : { action: "redirect", to: LOGIN_PATH };
  }

  const home = ROLE_HOME[role];
  if (isInside(pathname, home)) return { action: "allow" };
  return { action: "redirect", to: home };
}
