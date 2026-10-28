import type { UserRole } from "@/types/profile";

// Cada perfil tem a sua área. Quem não é da área volta para a própria.
export const ROLE_HOME: Record<UserRole, string> = {
  student: "/aluno",
  teacher: "/professor",
  librarian: "/funcionario",
};

export const LOGIN_PATH = "/login";

// Boas-vindas do celular (Figma, card 0221): qualquer pessoa abre; no computador a própria tela leva ao login.
export const WELCOME_PATH = "/boas-vindas";

// Landing page (Figma, cards 0195 e 0198): a raiz é pública para quem não está logado.
export const LANDING_PATH = "/";

// Aviso de privacidade (LGPD): qualquer pessoa lê, logada ou não.
export const PRIVACY_PATH = "/privacidade";

// Páginas públicas do rodapé da landing (Figma, card 0195): qualquer pessoa lê, logada ou não.
export const TERMS_PATH = "/termos";
export const ACCESSIBILITY_PATH = "/acessibilidade";
export const SUPPORT_PATH = "/suporte";
const PUBLIC_INFO_PATHS = [PRIVACY_PATH, TERMS_PATH, ACCESSIBILITY_PATH, SUPPORT_PATH];

export type RouteDecision =
  | { action: "allow" }
  | { action: "redirect"; to: string };

function isInside(pathname: string, area: string) {
  return pathname === area || pathname.startsWith(`${area}/`);
}

// Decide o que fazer com o endereço pedido. role é null quando a pessoa não está logada.
export function decideRoute(pathname: string, role: UserRole | null): RouteDecision {
  if (PUBLIC_INFO_PATHS.some((path) => isInside(pathname, path))) return { action: "allow" };

  if (role === null) {
    return pathname === LOGIN_PATH || pathname === LANDING_PATH || pathname === WELCOME_PATH
      ? { action: "allow" }
      : { action: "redirect", to: LOGIN_PATH };
  }

  const home = ROLE_HOME[role];
  if (isInside(pathname, home)) return { action: "allow" };
  return { action: "redirect", to: home };
}
