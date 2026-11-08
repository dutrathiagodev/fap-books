// Validação do link do convite (/definir-senha?token_hash=...&type=invite) antes de falar com o Supabase.
// Só o formato é conferido aqui; quem diz se o token vale (expirado, já usado) é o Supabase, no envio do formulário.

// Tipos de link aceitos nesta página. "recovery" (esqueci a senha) já é reconhecido, mas ainda não tem fluxo pronto.
export const SUPPORTED_LINK_TYPES = ["invite"] as const;
export type SupportedLinkType = (typeof SUPPORTED_LINK_TYPES)[number];

// O token_hash do Supabase é um texto hexadecimal/base64url curto (hoje 64 caracteres). A faixa é larga de propósito
// para não quebrar se o Supabase mudar o tamanho, mas barra lixo e textos enormes.
const TOKEN_HASH_PATTERN = /^[A-Za-z0-9_-]{16,256}$/;

export interface InviteLink {
  tokenHash: string;
  type: SupportedLinkType;
}

// Aceita o que veio da URL ou do formulário (pode ser qualquer coisa, inclusive lista ou vazio).
export function parseInviteLink(tokenHash: unknown, type: unknown): InviteLink | null {
  if (typeof tokenHash !== "string" || typeof type !== "string") return null;
  if (!(SUPPORTED_LINK_TYPES as readonly string[]).includes(type)) return null;
  if (!TOKEN_HASH_PATTERN.test(tokenHash)) return null;
  return { tokenHash, type: type as SupportedLinkType };
}
