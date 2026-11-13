// Registro de erros do servidor para o painel de Logs da Vercel [FAP - 0252].
// Uma linha JSON por erro, sem PII: NUNCA vai a mensagem do erro (ela pode trazer e-mail, matrícula ou texto digitado),
// nem a query string, nem cabeçalhos ou cookies. Fica só o que ajuda a achar o problema: o "digest" (o mesmo código que
// aparece na tela de erro e no log do Next), o tipo do erro, a rota e o método.
// Imports só de tipo e nenhum acesso a variáveis de ambiente: o módulo roda em qualquer runtime e é testável.

export interface ServerErrorEvent {
  evento: "erro_servidor";
  digest: string | null;
  tipo: string;
  rota: string;
  contexto: string;
  metodo: string;
  caminho: string;
}

interface RequestInfo {
  path: string;
  method: string;
}
interface ErrorContext {
  routePath: string;
  routeType: string;
}

const MAX_TEXT = 120;

function clean(value: unknown): string {
  return typeof value === "string" ? value.slice(0, MAX_TEXT) : "desconhecido";
}

// "/aluno/livros/123?q=maria" vira "/aluno/livros/123": a query pode ter nome ou termo de busca digitado.
function pathWithoutQuery(path: string): string {
  return clean(path.split("?")[0]?.split("#")[0]);
}

export function describeServerError(error: unknown, request: RequestInfo, context: ErrorContext): ServerErrorEvent {
  const digest =
    typeof error === "object" && error !== null && "digest" in error && typeof error.digest === "string"
      ? error.digest.slice(0, MAX_TEXT)
      : null;
  return {
    evento: "erro_servidor",
    digest,
    tipo: error instanceof Error ? clean(error.name) : "desconhecido",
    rota: clean(context.routePath),
    contexto: clean(context.routeType),
    metodo: clean(request.method),
    caminho: pathWithoutQuery(request.path),
  };
}
