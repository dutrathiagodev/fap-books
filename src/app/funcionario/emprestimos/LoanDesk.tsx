"use client";

import { useRef, useState, useTransition } from "react";
import { LoanSearch, LoanSummary } from "@/components";
import type { LoanBookCard, LoanUserCard } from "@/components/LoanSearch";
import type { LoanPreview, LoanReceipt } from "@/types/loan";
import {
  previewLoanAction,
  registerLoanAction,
  searchBooksForLoanAction,
  searchUsersAction,
  type LookupResult,
} from "./actions";
import { LoanAlert } from "./LoanAlert";
import { LoanReceiptCard } from "./LoanReceiptCard";
import { Stepper } from "@/components/Stepper";
import { useActionKeys } from "./useActionKeys";

const SEARCH_DELAY_MS = 300;
const NO_REGISTRATION = "—";
const NEW_LOAN = "new-loan";

type Status = "idle" | "searching" | "done" | "failed";

// Busca com espera de 300 ms depois da última tecla. Só a resposta da busca mais recente vale (as antigas são descartadas).
function useLookup<T>(action: (term: string) => Promise<LookupResult<T>>) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<T[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latest = useRef(0);

  function change(value: string) {
    setQuery(value);
    clearTimeout(timer.current);
    const id = ++latest.current;
    if (value.trim().length < 2) {
      setItems([]);
      setStatus("idle");
      return;
    }
    setStatus("searching");
    timer.current = setTimeout(async () => {
      const result = await action(value).catch(() => ({ ok: false as const, reason: "error" as const }));
      if (id !== latest.current) return;
      setItems(result.ok ? result.items : []);
      setStatus(result.ok ? "done" : "failed");
    }, SEARCH_DELAY_MS);
  }

  function reset() {
    clearTimeout(timer.current);
    latest.current++;
    setQuery("");
    setItems([]);
    setStatus("idle");
  }

  return { query, items, status, change, reset };
}

const OPTION =
  "flex w-full cursor-pointer flex-col items-start rounded-md border border-line bg-surface px-3 py-2 text-left text-sm hover:bg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-60";

function Options({ status, children }: { status: Status; children: React.ReactNode[] }) {
  if (status === "searching") return <p className="mt-2 text-sm text-ink-muted">Buscando…</p>;
  if (status === "failed") return <p role="alert" className="mt-2 text-sm text-danger-700">Não foi possível buscar agora.</p>;
  if (children.length === 0) return null;
  return <ul className="mt-2 flex flex-col gap-2">{children.map((child, i) => <li key={i}>{child}</li>)}</ul>;
}

// Balcão de empréstimo (Figma 6574-1330 a 6574-1640): usuário → livro → resumo → confirmar → comprovante.
// A tela só conduz: quem decide se o empréstimo vale é o servidor (preview e confirmar conferem tudo de novo).
export function LoanDesk() {
  const users = useLookup<LoanUserCard>(searchUsersAction);
  const books = useLookup<LoanBookCard>(searchBooksForLoanAction);
  const [user, setUser] = useState<LoanUserCard | null>(null);
  const [book, setBook] = useState<LoanBookCard | null>(null);
  const [preview, setPreview] = useState<LoanPreview | null>(null);
  const [receipt, setReceipt] = useState<LoanReceipt | null>(null);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  // Uma chave por tentativa de empréstimo: o clique duplo no confirmar envia a mesma chave e o banco registra uma vez.
  const keys = useActionKeys();

  const step = receipt ? 6 : confirming ? 4 : preview ? 3 : user ? 2 : 1;

  function loadPreview(nextUser: LoanUserCard | null, nextBook: LoanBookCard | null) {
    keys.done(NEW_LOAN);
    setPreview(null);
    setError(undefined);
    if (!nextUser || !nextBook) return;
    startTransition(async () => {
      const result = await previewLoanAction(nextUser.registration, nextBook.code).catch(() => null);
      if (!result) setError("Não foi possível calcular o resumo agora. Tente de novo.");
      else if (!result.ok) setError(result.message);
      else setPreview(result.preview);
    });
  }

  function pickUser(card: LoanUserCard) {
    setUser(card);
    users.reset();
    loadPreview(card, book);
  }

  function pickBook(card: LoanBookCard) {
    setBook(card);
    books.reset();
    loadPreview(user, card);
  }

  function back() {
    // Volta ao passo de escolher o livro; o usuário continua.
    setBook(null);
    setPreview(null);
    setError(undefined);
  }

  function confirm() {
    if (!user || !book) return;
    setError(undefined);
    setConfirming(true);
    startTransition(async () => {
      const result = await registerLoanAction(user.registration, book.code, keys.keyFor(NEW_LOAN)).catch(() => null);
      setConfirming(false);
      if (result?.ok) keys.done(NEW_LOAN);
      if (!result) setError("Não foi possível registrar agora. Tente de novo.");
      else if (!result.ok) setError(result.message);
      else setReceipt(result.receipt);
    });
  }

  function restart() {
    keys.done(NEW_LOAN);
    setUser(null);
    setBook(null);
    setPreview(null);
    setReceipt(null);
    setError(undefined);
    users.reset();
    books.reset();
  }

  if (receipt) {
    return (
      <div className="flex flex-col gap-6">
        <Stepper current={6} />
        <LoanReceiptCard receipt={receipt} onNew={restart} />
      </div>
    );
  }

  const userOptions = (
    <Options status={users.status}>
      {users.items.map((card) => (
        <button key={card.registration} type="button" className={OPTION} disabled={card.registration === NO_REGISTRATION} onClick={() => pickUser(card)}>
          <span className="font-medium text-ink">{card.name}</span>
          <span className="text-ink-muted">
            {card.roleLabel} · {card.registration === NO_REGISTRATION ? "sem matrícula" : card.registration} · {card.detail}
          </span>
          {card.registration === NO_REGISTRATION && (
            <span className="text-danger-700">Sem matrícula cadastrada: cadastre a matrícula para emprestar.</span>
          )}
        </button>
      ))}
    </Options>
  );
  const bookOptions = (
    <Options status={books.status}>
      {books.items.map((card) => (
        <button key={card.code} type="button" className={OPTION} disabled={card.situation !== "available"} onClick={() => pickBook(card)}>
          <span className="font-medium text-ink">{card.title}</span>
          <span className="text-ink-muted">
            {card.author} · Tombo {card.code}
            {card.situation !== "available" && " · indisponível"}
          </span>
        </button>
      ))}
    </Options>
  );

  const blocked = preview?.blocked ?? undefined;
  // Usuário e livro escolhidos mas ainda sem resumo (calculando ou com erro): o resumo fica vazio, sem botões.
  const summary = preview?.receipt;

  return (
    <div className="flex flex-col gap-6">
      <Stepper current={step} />
      {blocked ? (
        <LoanAlert tone="danger">{blocked}</LoanAlert>
      ) : (
        <LoanAlert tone="info">{preview?.notice ?? "Limite de 3 livros por usuário (4 para formandos). Prazo padrão de 7 dias."}</LoanAlert>
      )}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <LoanSearch
          userQuery={users.query}
          onUserQueryChange={users.change}
          user={user}
          userOptions={userOptions}
          bookQuery={books.query}
          onBookQueryChange={books.change}
          book={book}
          bookOptions={bookOptions}
        />
        <LoanSummary
          userName={summary?.userName}
          bookTitle={summary?.bookTitle}
          borrowedOn={summary?.borrowedOn}
          dueOn={summary?.dueOn}
          error={blocked ? undefined : error}
          confirmDisabled={Boolean(blocked) || pending}
          onBack={back}
          onConfirm={confirm}
        />
      </div>
    </div>
  );
}
