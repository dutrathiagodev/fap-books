import type { UserRole } from "@/types/profile";

// Cada perfil tem a sua área. Quem não é da área volta para a própria.
export const ROLE_HOME: Record<UserRole, string> = {
  student: "/aluno",
  teacher: "/professor",
  librarian: "/funcionario",
};

// Primeira tela de cada perfil depois do login: o acervo (a pessoa vai direto ao que usa; o endereço-base da área
// só redireciona para cá). O painel da bibliotecária entra aqui quando o card 0097 for entregue.
export const ROLE_LANDING: Record<UserRole, string> = {
  student: "/aluno/livros",
  teacher: "/professor/livros",
  librarian: "/funcionario/acervo",
};

// Rótulo de cada perfil na tela (menu do usuário e resultado da busca do balcão).
export const ROLE_LABELS: Record<UserRole, string> = { student: "Aluno", teacher: "Professor", librarian: "Funcionário" };

export const LOGIN_PATH = "/login";

// Listagem do acervo da bibliotecária: base dos endereços de novo/editar, filtros e revalidação.
export const ACERVO_PATH = "/funcionario/acervo";

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
// Definir a senha pelo link do convite (FAP-0087): a pessoa ainda não tem login, e quem já está logado (por exemplo a
// funcionária testando o convite no mesmo navegador) também precisa conseguir abrir o link.
export const DEFINE_PASSWORD_PATH = "/definir-senha";
const PUBLIC_INFO_PATHS = [PRIVACY_PATH, TERMS_PATH, ACCESSIBILITY_PATH, SUPPORT_PATH, DEFINE_PASSWORD_PATH];

export type RouteDecision =
  | { action: "allow" }
  | { action: "redirect"; to: string };

const PROTECTED_AREAS = Object.values(ROLE_HOME);

// Voltar ao endereço pedido depois do login (card 0246). Só aceita caminho interno de uma área protegida:
// "//site.com", "/\\site.com", endereço absoluto e o próprio /login nunca passam (evita redirecionamento aberto).
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return null;
  const pathname = raw.split(/[?#]/)[0];
  return PROTECTED_AREAS.some((area) => isInside(pathname, area)) ? raw : null;
}

function isInside(pathname: string, area: string) {
  return pathname === area || pathname.startsWith(`${area}/`);
}

// Decide o que fazer com o endereço pedido. role é null quando a pessoa não está logada.
// search é a parte "?x=y" do endereço: vai junto no ?next= para a pessoa voltar ao mesmo lugar depois de entrar.
export function decideRoute(pathname: string, role: UserRole | null, search = ""): RouteDecision {
  if (PUBLIC_INFO_PATHS.some((path) => isInside(pathname, path))) return { action: "allow" };

  if (role === null) {
    // Só as áreas dos perfis exigem login. Qualquer outro endereço segue adiante e cai na página 404 (card 0241).
    if (!PROTECTED_AREAS.some((area) => isInside(pathname, area))) return { action: "allow" };
    return { action: "redirect", to: `${LOGIN_PATH}?next=${encodeURIComponent(pathname + search)}` };
  }

  const home = ROLE_HOME[role];
  if (isInside(pathname, home)) return { action: "allow" };
  return { action: "redirect", to: home };
}
