import { createHash, timingSafeEqual } from "node:crypto";

// Segredo mínimo aceito (32 caracteres): um valor curto ou esquecido deixa a rota fechada em vez de aberta.
const MIN_SECRET_LENGTH = 32;

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

// Confere o cabeçalho "Authorization: Bearer <segredo>" das rotas chamadas pelas tarefas agendadas.
// Compara os resumos (SHA-256) em tempo constante, para não revelar o segredo pelo tempo de resposta.
export function isValidCronAuthorization(header: string | null, secret: string | undefined): boolean {
  if (!secret || secret.length < MIN_SECRET_LENGTH) return false;
  if (!header?.startsWith("Bearer ")) return false;
  return timingSafeEqual(digest(header.slice("Bearer ".length)), digest(secret));
}
