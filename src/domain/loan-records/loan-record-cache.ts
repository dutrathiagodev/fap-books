import type { LoanRecord } from "@/types/loan-record";
import { isValidIsoDate } from "./loan-record-rules";

// Cópia dos empréstimos no localStorage do navegador (a atividade da disciplina pede localStorage). A fonte de verdade é o
// Supabase; a cópia acompanha cada mudança e serve de reserva quando o banco não responde. Uma chave por pessoa, para duas
// contas no mesmo navegador não misturarem registros.
export function cacheKeyFor(userId: string): string {
  return `fap-books:controle-de-emprestimos:${userId}`;
}

function isRecord(value: unknown): value is LoanRecord {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.bookTitle === "string" &&
    typeof item.author === "string" &&
    typeof item.readerName === "string" &&
    typeof item.category === "string" &&
    typeof item.loanedOn === "string" &&
    isValidIsoDate(item.loanedOn) &&
    typeof item.dueOn === "string" &&
    isValidIsoDate(item.dueOn) &&
    (item.returnedOn === null || (typeof item.returnedOn === "string" && isValidIsoDate(item.returnedOn)))
  );
}

// Lê o texto salvo. Qualquer coisa fora do formato (texto vazio, JSON quebrado, lista de outro tipo) vira lista vazia;
// registro com campo faltando é descartado, o resto fica.
export function parseCachedRecords(raw: string | null): LoanRecord[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    return Array.isArray(data) ? data.filter(isRecord) : [];
  } catch {
    return [];
  }
}

export function serializeRecords(records: LoanRecord[]): string {
  return JSON.stringify(records);
}
