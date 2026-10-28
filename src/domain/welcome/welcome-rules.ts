// Regra das boas-vindas do celular (Figma, card 0221): aparecem só no primeiro acesso pela raiz, em tela de celular.
// Guardamos no próprio aparelho (localStorage) que a pessoa já viu; nada vai para o servidor.

export const WELCOME_SEEN_KEY = "fap-books:boas-vindas-vistas";

// Largura a partir da qual a tela é de computador (md do Tailwind). Abaixo disso é celular.
export const DESKTOP_MIN_WIDTH_PX = 768;

interface WelcomeContext {
  isMobile: boolean;
  // true se a pessoa já viu a tela, ou se o aparelho não deixa guardar (aí não repetimos, para não entrar em laço).
  alreadySeen: boolean;
}

export function shouldShowWelcome({ isMobile, alreadySeen }: WelcomeContext): boolean {
  return isMobile && !alreadySeen;
}
