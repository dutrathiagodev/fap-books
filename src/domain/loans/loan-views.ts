import type { OpenLoanView } from "@/types/loan";
import {
  calculateFine,
  formatLoanDate,
  formatReais,
  MAX_RENEWALS,
  renewBlockReason,
  RENEW_BLOCK_MESSAGES,
  renewedDueDate,
} from "./loan-rules";
import { initialsOf } from "./loan-lookup-rules";

// Uma linha do banco: empréstimo em aberto com o nome do usuário e o título do livro.
export interface OpenLoanRow {
  id: string;
  user_id: string;
  borrowed_at: string;
  due_at: string;
  renewals: number;
  profiles: { full_name: string; registration: string | null } | null;
  books: { title: string; code: string } | null;
}

// Monta a linha da tela. "now" entra de fora para o cálculo do atraso ser testável.
// openFineCents é o total de multas em aberto do usuário (quem deve não renova).
export function toOpenLoanView(row: OpenLoanRow, now: Date, openFineCents: number): OpenLoanView {
  const dueAt = new Date(row.due_at);
  const { daysLate, amountCents } = calculateFine(dueAt, now);
  const blocked = renewBlockReason({ renewals: row.renewals, dueAt, now, openFineCents });
  const name = row.profiles?.full_name ?? "Usuário removido";

  return {
    id: row.id,
    userName: name,
    initials: initialsOf(name),
    registration: row.profiles?.registration ?? "—",
    bookTitle: row.books?.title ?? "Livro removido",
    code: row.books?.code ?? "—",
    borrowedOn: formatLoanDate(new Date(row.borrowed_at)),
    dueOn: formatLoanDate(dueAt),
    newDueOn: formatLoanDate(renewedDueDate(dueAt)),
    daysLate,
    fineLabel: amountCents > 0 ? formatReais(amountCents) : "Sem multa",
    renewals: row.renewals,
    renewBlocked: blocked ? RENEW_BLOCK_MESSAGES[blocked] : null,
  };
}

// "1 de 3" na lista e "2 de 3 após confirmar" no painel de renovação.
export function renewalsLabel(renewals: number, afterConfirm = false): string {
  return afterConfirm ? `${renewals + 1} de ${MAX_RENEWALS} após confirmar` : `${renewals} de ${MAX_RENEWALS}`;
}

// Linhas do painel "Renovar empréstimo". Bloqueado (limite, atraso ou multa): não há novo prazo nem nova contagem,
// então essas duas linhas mostram "—" e só o aviso explica o motivo.
export function renewPanelRows(loan: Pick<OpenLoanView, "bookTitle" | "dueOn" | "newDueOn" | "renewals" | "renewBlocked">): [string, string][] {
  const blocked = Boolean(loan.renewBlocked);
  return [
    ["Livro", loan.bookTitle],
    ["Prazo atual", loan.dueOn],
    ["Novo prazo", blocked ? "—" : loan.newDueOn],
    ["Renovações", blocked ? renewalsLabel(loan.renewals) : renewalsLabel(loan.renewals, true)],
  ];
}
