// Tipos do balcão de empréstimo (Figma, card 0089). Datas já formatadas pelo servidor (dd/mm/aaaa).

export interface LoanReceipt {
  userName: string;
  bookTitle: string;
  borrowedOn: string;
  dueOn: string;
}

// Resumo antes de confirmar (passo 3). "blocked" traz o motivo em português quando o empréstimo não pode seguir.
export interface LoanPreview {
  receipt: LoanReceipt;
  notice: string;
  blocked: string | null;
}

// Uma linha das abas Devolução e Renovação.
export interface OpenLoanView {
  id: string;
  userName: string;
  initials: string;
  registration: string;
  bookTitle: string;
  code: string;
  borrowedOn: string;
  dueOn: string;
  newDueOn: string;
  daysLate: number;
  fineLabel: string;
  renewals: number;
  renewBlocked: string | null;
}

export type LoanActionFail = { ok: false; message: string };
export type LoanActionResult<T> = ({ ok: true } & T) | LoanActionFail;
