"use client";

import { Check } from "lucide-react";
import { useState, useTransition } from "react";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { renewalsLabel, renewPanelRows } from "@/domain/loans/loan-views";
import type { OpenLoanView } from "@/types/loan";
import { renewLoanAction } from "./actions";
import { LoanAlert, type LoanAlertTone } from "./LoanAlert";
import { LoanButton } from "./LoanButton";
import { LoanDetails } from "./LoanDetails";
import { LoanPerson } from "./LoanPerson";
import { useActionKeys } from "./useActionKeys";

// Aba Renovação (Figma 6574-1949): a lista à esquerda e o painel "Renovar empréstimo" à direita.
// O banco confere o limite de renovações, o atraso, a multa e as reservas; o aviso daqui é só para a bibliotecária saber antes.
export function RenewDesk({ loans }: { loans: OpenLoanView[] }) {
  const [selectedId, setSelectedId] = useState<string>();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ tone: LoanAlertTone; text: string }>();
  const keys = useActionKeys();
  const selected = loans.find((loan) => loan.id === selectedId);

  function confirm() {
    if (!selected) return;
    setNotice(undefined);
    startTransition(async () => {
      const result = await renewLoanAction(selected.id, keys.keyFor(selected.id)).catch(() => null);
      if (!result) return setNotice({ tone: "danger", text: "Não foi possível renovar agora. Tente de novo." });
      keys.done(selected.id);
      if (!result.ok) return setNotice({ tone: "danger", text: result.message });
      setNotice({ tone: "info", text: `Renovado: “${selected.bookTitle}” deve voltar até ${result.newDueOn} (${renewalsLabel(result.renewals)} renovações).` });
      setSelectedId(undefined);
    });
  }

  const columns: DataTableColumn<OpenLoanView>[] = [
    {
      key: "user",
      header: "Usuário",
      cell: (loan) => (
        <button
          type="button"
          aria-pressed={loan.id === selectedId}
          aria-label={`Selecionar ${loan.bookTitle} de ${loan.userName}`}
          onClick={() => {
            setSelectedId(loan.id);
            setNotice(undefined);
          }}
          className={`cursor-pointer rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${loan.id === selectedId ? "ring-2 ring-brand ring-offset-4 ring-offset-surface" : ""}`}
        >
          <LoanPerson name={loan.userName} initials={loan.initials} registration={loan.registration} />
        </button>
      ),
    },
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
    { key: "due", header: "Devolução", cell: (loan) => loan.dueOn },
    { key: "renewals", header: "Renov.", cell: (loan) => renewalsLabel(loan.renewals) },
  ];

  return (
    <div className="flex flex-col gap-4">
      {notice && <LoanAlert tone={notice.tone}>{notice.text}</LoanAlert>}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <DataTable columns={columns} rows={loans} rowKey={(loan) => loan.id} />

        <section aria-labelledby="renew-title" className="flex min-w-0 flex-col gap-3.5 rounded-lg border border-line bg-surface p-5">
          <h2 id="renew-title" className="text-base leading-6 font-semibold text-ink">Renovar empréstimo</h2>
          {selected ? (
            <>
              {selected.renewBlocked && <LoanAlert tone="danger">{selected.renewBlocked}</LoanAlert>}
              <LoanDetails rows={renewPanelRows(selected)} />
              <div className="flex flex-wrap justify-end gap-2.5">
                <LoanButton variant="outline" onClick={() => setSelectedId(undefined)}>Cancelar</LoanButton>
                <LoanButton icon={selected.renewBlocked ? undefined : Check} disabled={pending || Boolean(selected.renewBlocked)} onClick={confirm}>
                  Confirmar renovação
                </LoanButton>
              </div>
            </>
          ) : (
            <p className="text-sm text-ink-muted">Escolha um empréstimo na lista para ver o novo prazo.</p>
          )}
        </section>
      </div>
    </div>
  );
}
