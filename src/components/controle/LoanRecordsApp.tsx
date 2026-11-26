"use client";

import { useState, useTransition } from "react";
import { BookOpen } from "lucide-react";
import {
  addLoanRecordAction,
  deleteLoanRecordAction,
  returnLoanRecordAction,
} from "@/app/actions/loan-records";
import {
  categoriesOf,
  DEFAULT_LOAN_FILTERS,
  filterRecords,
  summarize,
} from "@/domain/loan-records/loan-record-rules";
import type { LoanRecord, LoanRecordFilters as Filters, LoanRecordValues } from "@/types/loan-record";
import { EmptyState } from "../EmptyState";
import { Modal } from "../Modal";
import { LoanRecordFilters } from "./LoanRecordFilters";
import { LoanRecordForm } from "./LoanRecordForm";
import { LoanRecordList } from "./LoanRecordList";
import { LoanRecordSummary } from "./LoanRecordSummary";

interface LoanRecordsAppProps {
  initialRecords: LoanRecord[];
  // Hoje (aaaa-mm-dd), vindo do servidor: o selo de atraso é o mesmo na primeira tela e depois dela.
  today: string;
}

// Controle de empréstimo de livros. A lista, os filtros e o formulário ficam em useState; os contadores saem da lista
// (summarize) a cada render; map() desenha, filter() filtra e exclui. Cada mudança é gravada no Supabase (Server Actions) e só
// então entra na lista da tela.
export function LoanRecordsApp({ initialRecords, today }: LoanRecordsAppProps) {
  const [records, setRecords] = useState<LoanRecord[]>(initialRecords);
  const [filters, setFilters] = useState<Filters>(DEFAULT_LOAN_FILTERS);
  const [toDelete, setToDelete] = useState<LoanRecord | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const summary = summarize(records, today);
  const visible = filterRecords(records, filters);
  const filtered = filters.status !== "all" || Boolean(filters.category || filters.query.trim());

  async function add(values: LoanRecordValues) {
    setError("");
    const result = await addLoanRecordAction(values);
    if (!result.ok) return { errors: result.errors, message: result.errors ? undefined : result.message };
    setRecords((current) => [result.record, ...current]);
  }

  function markReturned(record: LoanRecord) {
    setError("");
    setBusyId(record.id);
    startTransition(async () => {
      const result = await returnLoanRecordAction(record.id, today);
      if (result.ok) setRecords((current) => current.map((item) => (item.id === record.id ? result.record : item)));
      else setError(result.message);
      setBusyId(null);
    });
  }

  function confirmDelete() {
    const record = toDelete;
    if (!record) return;
    setBusyId(record.id);
    startTransition(async () => {
      const result = await deleteLoanRecordAction(record.id);
      if (result.ok) setRecords((current) => current.filter((item) => item.id !== record.id));
      else setError(result.message);
      setBusyId(null);
      setToDelete(null);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <LoanRecordSummary summary={summary} />
      <LoanRecordForm onSubmit={add} pending={false} />

      <section aria-label="Lista de empréstimos" className="flex flex-col gap-4">
        <LoanRecordFilters filters={filters} categories={categoriesOf(records)} onChange={setFilters} />
        {error && (
          <p role="alert" className="text-sm text-danger-700 dark:text-red-300">
            {error}
          </p>
        )}
        <p role="status" className="text-sm text-ink-muted">
          {visible.length === 1 ? "1 empréstimo" : `${visible.length} empréstimos`}
          {filtered && ` de ${records.length}`}
        </p>
        {visible.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={records.length === 0 ? "Nenhum empréstimo cadastrado" : "Nenhum empréstimo com esse filtro"}
            description={
              records.length === 0
                ? "Preencha o formulário acima para registrar o primeiro empréstimo."
                : "Tente outro status, categoria ou busca."
            }
            action={
              filtered ? (
                <button type="button" onClick={() => setFilters(DEFAULT_LOAN_FILTERS)} className="cursor-pointer text-sm font-medium text-link underline">
                  Limpar filtros
                </button>
              ) : undefined
            }
          />
        ) : (
          <LoanRecordList records={visible} today={today} busyId={pending ? busyId : null} onReturn={markReturned} onDelete={setToDelete} />
        )}
      </section>

      <Modal
        open={toDelete !== null}
        destructive
        title="Excluir empréstimo?"
        description={toDelete ? `Você vai excluir o registro de "${toDelete.bookTitle}". Esta ação não pode ser desfeita.` : undefined}
        cancelLabel="Cancelar"
        confirmLabel={pending ? "Excluindo..." : "Excluir"}
        confirmVariant="danger"
        confirmDisabled={pending}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
