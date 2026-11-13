"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useActionKeys } from "@/app/funcionario/emprestimos/useActionKeys";
import type { LoanActionResult } from "../types/loan";
import type { MyLoanView } from "../types/student";
import { DeadlineBadge } from "./DeadlineBadge";

interface StudentLoanListProps {
  loans: MyLoanView[];
  // Server Action de renovação: confere de novo quem está logado e deixa o banco decidir.
  renew: (loanId: string, idempotencyKey: string) => Promise<LoanActionResult<{ newDueOn: string; renewals: number }>>;
}

// Meus empréstimos (Figma, card 0215): um cartão por livro com prazo, renovações e o botão Renovar.
// Quando não pode renovar (atraso, multa ou 3 renovações), o botão fica desligado e o motivo aparece escrito ao lado.
export function StudentLoanList({ loans, renew }: StudentLoanListProps) {
  const router = useRouter();
  const keys = useActionKeys();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  function handleRenew(loan: MyLoanView) {
    setMessage(null);
    setBusyId(loan.id);
    startTransition(async () => {
      try {
        const result = await renew(loan.id, keys.keyFor(loan.id));
        // Sucesso ou recusa da regra: a ação terminou, a próxima tentativa ganha chave nova. Falha de rede mantém a chave.
        keys.done(loan.id);
        if (result.ok) {
          setMessage({ tone: "ok", text: `"${loan.bookTitle}" renovado. Novo prazo: ${result.newDueOn}.` });
          router.refresh();
        } else {
          setMessage({ tone: "error", text: result.message });
        }
      } catch {
        setMessage({ tone: "error", text: "Não foi possível renovar agora. Tente de novo." });
      } finally {
        setBusyId(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {message && (
        <p
          role={message.tone === "error" ? "alert" : "status"}
          className={`rounded-lg border px-4 py-3 text-sm ${
            message.tone === "error"
              ? "border-danger-700 bg-danger-100 text-danger-700 dark:border-red-400/40 dark:bg-red-400/15 dark:text-red-300"
              : "border-success-700 bg-success-100 text-success-700 dark:border-green-400/40 dark:bg-green-400/15 dark:text-green-300"
          }`}
        >
          {message.text}
        </p>
      )}
      <ul className="flex flex-col gap-3">
        {loans.map((loan) => (
          <li key={loan.id} className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="break-words font-medium text-ink">{loan.bookTitle}</p>
              <p className="mt-0.5 text-xs text-ink-muted">
                Tombo {loan.code} · Retirado em {loan.borrowedOn} · Renovações: {loan.renewalsLabel}
              </p>
              <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink">
                Devolver até {loan.dueOn}
                {loan.status && <DeadlineBadge status={loan.status} />}
              </p>
              {loan.status && <p className="mt-0.5 text-xs text-ink-muted">{loan.whenLabel}</p>}
            </div>
            <div className="flex flex-col gap-1 sm:items-end">
              <button
                type="button"
                disabled={Boolean(loan.renewBlocked) || pending}
                aria-busy={busyId === loan.id || undefined}
                aria-describedby={loan.renewBlocked ? `bloqueio-${loan.id}` : undefined}
                aria-label={`Renovar ${loan.bookTitle}`}
                onClick={() => handleRenew(loan)}
                className="inline-flex h-11 min-w-32 cursor-pointer items-center justify-center rounded-md bg-btn-soft px-4 text-sm font-medium text-brand-ink transition-colors hover:bg-btn-soft-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50 dark:text-navy-200"
              >
                {busyId === loan.id ? "Renovando..." : "Renovar"}
              </button>
              {loan.renewBlocked ? (
                <p id={`bloqueio-${loan.id}`} className="max-w-64 text-xs text-ink-muted sm:text-right">
                  {loan.renewBlocked}
                </p>
              ) : (
                <p className="text-xs text-ink-muted">Novo prazo: {loan.newDueOn}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
