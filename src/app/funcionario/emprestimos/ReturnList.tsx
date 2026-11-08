"use client";

import { useState, useTransition } from "react";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { FINE_PER_DAY_CENTS, formatReais } from "@/domain/loans/loan-rules";
import type { OpenLoanView } from "@/types/loan";
import { returnLoanAction } from "./actions";
import { LoanAlert, type LoanAlertTone } from "./LoanAlert";
import { LoanButton } from "./LoanButton";
import { LoanPerson } from "./LoanPerson";
import { useActionKeys } from "./useActionKeys";

// Aba Devolução (Figma 6574-1777): empréstimos em aberto, o mais atrasado primeiro, com o atraso e a multa de cada um.
// A devolução com atraso mostra o aviso da multa (calculada e gravada pelo banco); a baixa do pagamento é na tela de Multas.
export function ReturnList({ loans }: { loans: OpenLoanView[] }) {
  const [pending, startTransition] = useTransition();
  const [workingId, setWorkingId] = useState<string>();
  const [notice, setNotice] = useState<{ tone: LoanAlertTone; text: string }>();
  const keys = useActionKeys();

  function giveBack(loan: OpenLoanView) {
    setWorkingId(loan.id);
    setNotice(undefined);
    startTransition(async () => {
      const result = await returnLoanAction(loan.id, keys.keyFor(loan.id)).catch(() => null);
      setWorkingId(undefined);
      if (!result) setNotice({ tone: "danger", text: "Não foi possível registrar a devolução agora. Tente de novo." });
      else if (!result.ok) {
        keys.done(loan.id);
        setNotice({ tone: "danger", text: result.message });
      } else {
        keys.done(loan.id);
        setNotice(
          result.fineSentence
            ? { tone: "warning", text: `Devolução com atraso de “${loan.bookTitle}”: ${result.fineSentence}.` }
            : { tone: "info", text: `Devolução de “${loan.bookTitle}” registrada. O livro está disponível de novo.` },
        );
      }
    });
  }

  const columns: DataTableColumn<OpenLoanView>[] = [
    { key: "user", header: "Usuário", cell: (loan) => <LoanPerson name={loan.userName} initials={loan.initials} registration={loan.registration} /> },
    {
      key: "book",
      header: "Livro",
      cell: (loan) => (
        <>
          <p className="font-medium text-ink">{loan.bookTitle}</p>
          <p className="text-xs text-ink-muted">Tombo {loan.code}</p>
        </>
      ),
    },
    { key: "due", header: "Previsto", cell: (loan) => loan.dueOn },
    {
      key: "late",
      header: "Atraso",
      cell: (loan) => (
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${
            loan.daysLate > 0
              ? "bg-danger-100 text-danger-700 dark:bg-red-400/15 dark:text-red-300"
              : "bg-success-100 text-success-700 dark:bg-green-400/15 dark:text-green-300"
          }`}
        >
          {loan.daysLate > 0 ? `${loan.daysLate} ${loan.daysLate === 1 ? "dia" : "dias"}` : "No prazo"}
        </span>
      ),
    },
    { key: "fine", header: "Multa", cell: (loan) => loan.fineLabel },
    {
      key: "action",
      header: "Ação",
      cell: (loan) => (
        <LoanButton
          size="small"
          variant={loan.daysLate > 0 ? "primary" : "outline"}
          disabled={pending}
          label={`Registrar devolução de ${loan.bookTitle} de ${loan.userName}`}
          onClick={() => giveBack(loan)}
        >
          {workingId === loan.id ? "Registrando…" : "Registrar devolução"}
        </LoanButton>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {notice && <LoanAlert tone={notice.tone}>{notice.text}</LoanAlert>}
      <DataTable columns={columns} rows={loans} rowKey={(loan) => loan.id} />
      {loans.some((loan) => loan.daysLate > 0) && (
        <LoanAlert tone="warning">
          Devolução com atraso gera multa de {formatReais(FINE_PER_DAY_CENTS)} por dia. O pagamento é feito presencialmente, no balcão.
        </LoanAlert>
      )}
    </div>
  );
}
