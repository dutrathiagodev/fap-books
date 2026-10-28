// Classes repetidas da landing, nas medidas do Figma (cards 0195 e 0198, quadros de 1440 px).

// Conteúdo de 1200 px centralizado (1264 px de largura menos 32 px de respiro de cada lado).
export const CONTAINER = "mx-auto w-full max-w-[1264px] px-4 md:px-8";

const BUTTON_BASE =
  "inline-flex h-12 items-center justify-center gap-2.5 rounded-md px-6 text-[15px] font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

// Botão azul (principal) e botão claro (secundário), 48 px de altura, cantos de 8 px.
export const BUTTON_PRIMARY = `${BUTTON_BASE} bg-brand text-on-brand hover:bg-brand-hover`;
export const BUTTON_SOFT = `${BUTTON_BASE} bg-selected text-ink hover:bg-navy-200`;
