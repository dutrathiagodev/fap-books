// Áreas que mostram dados de quem está logado. Depois de Sair, o botão Voltar do navegador não pode
// reexibir essas telas (FAP-0261): por isso elas saem com "no-store" e nunca ficam no cache do navegador.
// Fica fora do next.config.ts para o teste poder conferir a lista sem subir o servidor.
export const PRIVATE_AREA_SOURCES = [
  "/aluno/:path*",
  "/professor/:path*",
  "/funcionario/:path*",
] as const;

export const PRIVATE_AREA_HEADERS = [
  { key: "Cache-Control", value: "private, no-store, max-age=0" },
];
