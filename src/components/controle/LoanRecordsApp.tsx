"use client";

import { useEffect, useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { BookOpen } from "lucide-react";
import {
  addLoanRecordAction,
  deleteLoanRecordAction,
  returnLoanRecordAction,
} from "@/app/actions/loan-records";
import { cacheKeyFor, parseCachedRecords, serializeRecords } from "@/domain/loan-records/loan-record-cache";
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
  // Quem está logado: a cópia no localStorage tem uma chave por pessoa.
  userId: string;
  initialRecords: LoanRecord[];
  // Hoje (aaaa-mm-dd), vindo do servidor: o selo de atraso é o mesmo na primeira tela e depois dela.
  today: string;
  // true quando o servidor não conseguiu ler o Supabase: a lista vem da cópia salva neste navegador.
  fromCache?: boolean;
}

function noopSubscribe() {
  return () => {};
}

// Texto salvo no localStorage (null no servidor e quando o navegador bloqueia o armazenamento).
function readCachedText(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

// Controle de empréstimo de livros. A lista, os filtros e o formulário ficam em useState; os contadores saem da lista
// (summarize) a cada render; map() desenha, filter() filtra e exclui. Cada mudança é gravada no Supabase (Server Actions) e só
// então entra na lista da tela. A lista também é copiada no localStorage a cada mudança; se o Supabase não responder ao abrir
// a página, a tela mostra essa cópia.
export function LoanRecordsApp({ userId, initialRecords, today, fromCache = false }: LoanRecordsAppProps) {
  const [savedRecords, setRecords] = useState<LoanRecord[]>(initialRecords);
  const cacheKey = cacheKeyFor(userId);
  // O localStorage só existe no navegador: no servidor a cópia é null (useSyncExternalStore evita diferença na hidratação).
  const cachedText = useSyncExternalStore(
    noopSubscribe,
    () => (fromCache ? readCachedText(cacheKey) : null),
    () => null,
  );
  const cachedRecords = useMemo(() => parseCachedRecords(cachedText), [cachedText]);
  // Com o banco fora do ar a tela mostra só a cópia (somente leitura); no resto do tempo, a lista que veio do Supabase.
  const records = fromCache ? cachedRecords : savedRecords;

  useEffect(() => {
    // Com o banco fora do ar, a lista na tela é a própria cópia: não regravar por cima.
    if (fromCache) return;
    try {
      window.localStorage.setItem(cacheKey, serializeRecords(records));
    } catch {
      // Armazenamento cheio ou bloqueado (janela privada): a cópia é só reserva, o Supabase segue valendo.
    }
  }, [records, cacheKey, fromCache]);
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
      {fromCache && (
        <p role="status" className="rounded-lg border border-line bg-surface p-4 text-sm text-ink-muted">
          Não foi possível falar com o servidor agora. Estes são os empréstimos salvos neste navegador; novos registros só
          funcionam quando a conexão voltar.
        </p>
      )}
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
