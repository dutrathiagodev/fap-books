import type { Instrumentation } from "next";
import { describeServerError } from "@/lib/error-log";

// O Next chama isto a cada erro do servidor (página, ação, rota). Vai para o painel de Logs da Vercel como uma linha
// JSON de nível "error", sem PII (veja src/lib/error-log.ts e a decisão em docs/infra-e-plano-gratuito.md, seção 3).
export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  console.error(JSON.stringify(describeServerError(error, request, context)));
};
