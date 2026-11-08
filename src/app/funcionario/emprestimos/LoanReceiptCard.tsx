"use client";

import { CircleCheck, FileText, Plus } from "lucide-react";
import type { LoanReceipt } from "@/types/loan";
import { LoanButton } from "./LoanButton";
import { LoanDetails } from "./LoanDetails";

// Comprovante do empréstimo registrado (Figma 6574-1640, card 0134). "Imprimir" abre a impressão do navegador
// (os botões saem da impressão; esconder o menu lateral na impressão fica para o AppShell).
export function LoanReceiptCard({ receipt, onNew }: { receipt: LoanReceipt; onNew: () => void }) {
  return (
    <section
      aria-labelledby="loan-receipt-title"
      className="mx-auto flex w-full max-w-xl flex-col items-center gap-5 rounded-lg border border-line bg-surface p-6 sm:p-8"
    >
      <span className="flex size-14 items-center justify-center rounded-full bg-success-100 text-success-700 dark:bg-green-400/15 dark:text-green-300">
        <CircleCheck size={28} strokeWidth={1.5} aria-hidden />
      </span>
      <h2 id="loan-receipt-title" className="text-h3">
        Empréstimo registrado
      </h2>
      <LoanDetails
        className="w-full rounded-lg bg-subtle p-4"
        rows={[
          ["Usuário", receipt.userName],
          ["Livro", receipt.bookTitle],
          ["Retirada", receipt.borrowedOn],
          ["Devolução", receipt.dueOn],
        ]}
      />
      <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row print:hidden">
        <LoanButton variant="outline" icon={FileText} onClick={() => window.print()}>
          Imprimir comprovante
        </LoanButton>
        <LoanButton icon={Plus} onClick={onNew}>
          Novo empréstimo
        </LoanButton>
      </div>
    </section>
  );
}
