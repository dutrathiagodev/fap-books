import { DEFINE_PASSWORD_PATH } from "../domain/access/access-rules";

// Endereço público do site, usado no link do e-mail de convite. Vem do ambiente (NEXT_PUBLIC_SITE_URL), nunca do
// navegador, e só vale se estiver na lista de origens permitidas: assim ninguém faz o convite apontar para outro site.

export const PRODUCTION_ORIGIN = "https://fap-books.vercel.app";
export const DEVELOPMENT_ORIGIN = "http://localhost:3000";

// Produção; previews da Vercel (fap-books-<algo>.vercel.app); e o computador de quem desenvolve (qualquer porta).
const ALLOWED_ORIGINS: RegExp[] = [
  /^https:\/\/fap-books\.vercel\.app$/,
  /^https:\/\/fap-books(-[a-z0-9]+)+\.vercel\.app$/,
  /^http:\/\/(localhost|127\.0\.0\.1):\d{2,5}$/,
];

export function isAllowedOrigin(origin: string): boolean {
  return ALLOWED_ORIGINS.some((pattern) => pattern.test(origin));
}

// Normaliza para só a origem (sem caminho, barra final nem parâmetros) e confere na lista.
// Vazio, malformado ou fora da lista: cai no padrão seguro do ambiente (produção ou localhost).
export function resolveSiteOrigin(raw: string | undefined, isProduction: boolean): string {
  const fallback = isProduction ? PRODUCTION_ORIGIN : DEVELOPMENT_ORIGIN;
  if (!raw) return fallback;
  try {
    const origin = new URL(raw.trim()).origin;
    return isAllowedOrigin(origin) ? origin : fallback;
  } catch {
    return fallback;
  }
}

// Link que o e-mail de convite usa como {{ .RedirectTo }}.
export function getInviteRedirectUrl(): string {
  return `${resolveSiteOrigin(process.env.NEXT_PUBLIC_SITE_URL, process.env.NODE_ENV === "production")}${DEFINE_PASSWORD_PATH}`;
}
