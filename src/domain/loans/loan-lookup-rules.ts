import type { LoanUserCard } from "@/components/LoanSearch";
import { ROLE_LABELS } from "../access/access-rules";
import { formatReais, loanLimitFor } from "./loan-rules";
import type { UserRole } from "@/types/profile";

// Limites da consulta do balcão: termo curto demais traria a lista inteira; termo longo demais é abuso.
const LOOKUP_MIN_LENGTH = 2;
export const LOOKUP_MAX_LENGTH = 60;
export const LOOKUP_MAX_RESULTS = 5;

export type LookupTerm = { ok: true; term: string } | { ok: false; reason: "term_too_short" };

// Prepara o texto digitado: tira controles e "*" (o PostgREST troca "*" por "%"), junta espaços e corta no máximo.
export function parseLookupTerm(raw: string): LookupTerm {
  const term = raw
    .replace(/[\p{C}*]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, LOOKUP_MAX_LENGTH)
    .trim();
  return term.length >= LOOKUP_MIN_LENGTH ? { ok: true, term } : { ok: false, reason: "term_too_short" };
}

// Faz "\", "%" e "_" valerem como texto comum no LIKE/ILIKE: quem digita "100%" não vira curinga.
export function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, "\\$&");
}

// Inicial do primeiro nome e do último sobrenome, em maiúsculas (ex.: "Maria da Silva" vira "MS").
export function initialsOf(fullName: string): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return (words[0][0] + last).toLocaleUpperCase("pt-BR");
}

export interface LoanUserRow {
  full_name: string;
  role: UserRole;
  registration: string | null;
  course: string | null;
  job_title: string | null;
  graduating?: boolean;
}

// Monta o cartão do usuário. Sem matrícula ou curso, o cartão mostra "—" (o frame sempre tem os três campos).
// Multa em aberto ou livro em atraso contam como pendência (RF-15): o selo concorda com o bloqueio do balcão.
export function toLoanUserCard(row: LoanUserRow, activeLoans: number, openFineCents: number, overdueLoans = 0): LoanUserCard {
  const pending = openFineCents > 0 || overdueLoans > 0;
  return {
    initials: initialsOf(row.full_name),
    name: row.full_name,
    roleLabel: ROLE_LABELS[row.role],
    registration: row.registration ?? "—",
    detail: (row.role === "librarian" ? row.job_title : row.course) ?? "—",
    activeLoans,
    loanLimit: loanLimitFor(row.graduating),
    pendingLabel:
      openFineCents > 0
        ? `Multa em aberto: ${formatReais(openFineCents)}`
        : overdueLoans > 0
          ? `Livro em atraso: ${overdueLoans}`
          : "Sem pendências",
    pendingTone: pending ? "danger" : "ok",
  };
}
