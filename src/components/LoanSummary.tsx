"use client";

import { Check } from "lucide-react";
import { FieldError } from "./FieldError";

// Datas já formatadas (ex.: "03/11/2026"). O prazo é a data de devolução; quem calcula é a página.
export interface LoanSummaryProps {
  userName?: string;
  bookTitle?: string;
  borrowedOn?: string;
  dueOn?: string;
  error?: string;
  // Multa em aberto ou livro indisponível: o frame desliga o confirmar e tira o ícone.
  confirmDisabled?: boolean;
  onBack?: () => void;
  onConfirm?: () => void;
}

const TITLE = "Resumo do empréstimo";
const EMPTY = "Nenhum empréstimo para resumir. Escolha o usuário e o livro para ver o prazo.";
const BACK = "Voltar";
const CONFIRM = "Confirmar empréstimo";

const ROWS = [
  { key: "userName", label: "Usuário" },
  { key: "bookTitle", label: "Livro" },
  { key: "borrowedOn", label: "Retirada" },
  { key: "dueOn", label: "Devolução" },
] as const;

const BUTTON =
  "inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-md px-5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed";

// Resumo do empréstimo e o prazo de devolução (Figma, frame 0129, passo Resumo).
// Só desenha: a página entrega os nomes, as datas, o vazio ou o erro.
export function LoanSummary({
  userName,
  bookTitle,
  borrowedOn,
  dueOn,
  error,
  confirmDisabled = false,
  onBack,
  onConfirm,
}: LoanSummaryProps) {
  const values = { userName, bookTitle, borrowedOn, dueOn };
  const filled = ROWS.some((row) => values[row.key]);
  const locked = confirmDisabled || Boolean(error);

  return (
    <section className={`@container flex flex-col gap-3.5 rounded-lg border bg-surface p-5 ${error ? "border-danger-700" : "border-line"}`}>
      <h2 className="text-base leading-6 font-semibold text-ink">{TITLE}</h2>
      {error && <FieldError message={error} />}
      {filled ? (
        <>
          <dl className="flex flex-col gap-3.5">
            {ROWS.map((row) => (
              <div key={row.key} className="flex items-start justify-between gap-3">
                <dt className="shrink-0 text-sm leading-5 text-ink-muted">{row.label}</dt>
                <dd className="min-w-0 text-right text-[13px] leading-[18px] font-semibold break-words text-ink">
                  {values[row.key] || "—"}
                </dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-col-reverse gap-2.5 @min-[320px]:flex-row @min-[320px]:justify-end">
            <button type="button" onClick={onBack} className={`${BUTTON} w-full border border-line-strong bg-surface text-brand hover:bg-subtle @min-[320px]:w-auto`}>
              {BACK}
            </button>
            <button
              type="button"
              disabled={locked}
              onClick={onConfirm}
              className={`${BUTTON} w-full @min-[320px]:w-auto ${locked ? "bg-selected text-ink-muted" : "bg-brand text-on-brand hover:bg-brand-hover"}`}
            >
              {!locked && <Check size={18} strokeWidth={1.5} aria-hidden />}
              {CONFIRM}
            </button>
          </div>
        </>
      ) : (
        !error && <p className="text-sm leading-5 text-ink-muted">{EMPTY}</p>
      )}
    </section>
  );
}
