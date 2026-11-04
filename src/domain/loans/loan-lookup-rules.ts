import type { LoanUserCard } from "@/components/LoanSearch";
import type { UserRole } from "@/types/profile";

// Limites da consulta do balcão: termo curto demais traria a lista inteira; termo longo demais é abuso.
export const LOOKUP_MIN_LENGTH = 2;
export const LOOKUP_MAX_LENGTH = 60;
export const LOOKUP_MAX_RESULTS = 5;

// Limite de livros ao mesmo tempo (PRD, RF-14). Formandos podem 4, mas o banco ainda não guarda quem é formando.
export const LOAN_LIMIT = 3;

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

const ROLE_LABELS: Record<UserRole, string> = { student: "Aluno", teacher: "Professor", librarian: "Funcionário" };

// Inicial do primeiro nome e do último sobrenome, em maiúsculas (ex.: "Maria da Silva" vira "MS").
export function initialsOf(fullName: string): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return (words[0][0] + last).toLocaleUpperCase("pt-BR");
}

// "R$ 8,00" a partir de centavos.
function formatReais(cents: number): string {
  return `R$ ${(cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export interface LoanUserRow {
  full_name: string;
  role: UserRole;
  registration: string | null;
  course: string | null;
  job_title: string | null;
}

// Monta o cartão do usuário. Sem matrícula ou curso, o cartão mostra "—" (o frame sempre tem os três campos).
export function toLoanUserCard(row: LoanUserRow, activeLoans: number, openFineCents: number): LoanUserCard {
  return {
    initials: initialsOf(row.full_name),
    name: row.full_name,
    roleLabel: ROLE_LABELS[row.role],
    registration: row.registration ?? "—",
    detail: (row.role === "librarian" ? row.job_title : row.course) ?? "—",
    activeLoans,
    loanLimit: LOAN_LIMIT,
    pendingLabel: openFineCents > 0 ? `Multa em aberto: ${formatReais(openFineCents)}` : "Sem pendências",
    pendingTone: openFineCents > 0 ? "danger" : "ok",
  };
}
