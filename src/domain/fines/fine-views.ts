import { initialsOf } from "../loans/loan-lookup-rules";
import type { FineView } from "../../types/fine";
import { formatFineDate, formatFineDateTime, formatReais } from "./fine-rules";

// Uma linha do banco: multa com o usuário, o empréstimo (e o livro) e quem registrou a baixa.
export interface FineRow {
  id: string;
  days_late: number;
  amount_cents: number;
  paid_at: string | null;
  profiles: { full_name: string; registration: string | null } | null;
  payer: { full_name: string } | null;
  loans: { due_at: string; books: { title: string; code: string } | null } | null;
}

// Monta a linha da tela. Multa paga sem o nome de quem registrou (perfil apagado) mostra "—" em vez de inventar autor.
export function toFineView(row: FineRow): FineView {
  const name = row.profiles?.full_name ?? "Usuário removido";
  const paid = row.paid_at !== null;
  return {
    id: row.id,
    userName: name,
    initials: initialsOf(name),
    registration: row.profiles?.registration ?? "—",
    bookTitle: row.loans?.books?.title ?? "Livro removido",
    code: row.loans?.books?.code ?? "—",
    dueOn: row.loans ? formatFineDate(new Date(row.loans.due_at)) : "—",
    daysLate: row.days_late,
    amountCents: row.amount_cents,
    amountLabel: formatReais(row.amount_cents),
    paid,
    paidAt: row.paid_at ? formatFineDateTime(new Date(row.paid_at)) : null,
    paidBy: paid ? (row.payer?.full_name ?? "—") : null,
  };
}
