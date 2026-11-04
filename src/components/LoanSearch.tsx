"use client";

import { CircleAlert, Search } from "lucide-react";
import type { BookSituation } from "@/types/book";
import { SituationBadge } from "./SituationBadge";

// Usuário já escolhido no balcão (frame 0129, passo Usuário).
export interface LoanUserCard {
  initials: string;
  name: string;
  // Perfil, matrícula e um detalhe (curso ou cargo), na ordem do frame.
  roleLabel: string;
  registration: string;
  detail: string;
  activeLoans: number;
  loanLimit: number;
  // A página escreve a frase ("Sem pendências" ou "Multa em aberto: R$ 8,00").
  pendingLabel: string;
  pendingTone: "ok" | "danger";
}

// Livro já escolhido (frame 0129, passo Livro).
export interface LoanBookCard {
  title: string;
  author: string;
  code: string;
  coverUrl?: string | null;
  situation: BookSituation;
}

export interface LoanSearchProps {
  idPrefix?: string;
  userQuery: string;
  onUserQueryChange: (value: string) => void;
  user: LoanUserCard | null;
  userError?: string;
  bookQuery: string;
  onBookQueryChange: (value: string) => void;
  book: LoanBookCard | null;
  bookError?: string;
}

const FOCUS = "outline-offset-2 focus-visible:outline-2 focus-visible:outline-focus";

// Busca de usuário e de livro do balcão (Figma, card 0130, frame 0129).
// Só desenha: a página busca e entrega o cartão, o vazio ou o erro.
export function LoanSearch({
  idPrefix = "loan",
  userQuery,
  onUserQueryChange,
  user,
  userError,
  bookQuery,
  onBookQueryChange,
  book,
  bookError,
}: LoanSearchProps) {
  return (
    <div className="flex flex-col gap-4">
      <UserSlot
        id={`${idPrefix}-user`}
        query={userQuery}
        onQueryChange={onUserQueryChange}
        user={user}
        error={userError}
      />
      <BookSlot
        id={`${idPrefix}-book`}
        query={bookQuery}
        onQueryChange={onBookQueryChange}
        book={book}
        error={bookError}
      />
    </div>
  );
}

function UserSlot({
  id,
  query,
  onQueryChange,
  user,
  error,
}: {
  id: string;
  query: string;
  onQueryChange: (value: string) => void;
  user: LoanUserCard | null;
  error?: string;
}) {
  const danger = Boolean(error) || user?.pendingTone === "danger";

  return (
    <article className={`rounded-lg border bg-surface p-4 ${danger ? "border-danger-700" : "border-line"}`}>
      <p className="text-xs text-ink-muted">Usuário</p>
      {user ? (
        <div className="mt-3 flex gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-selected text-sm font-medium text-brand">
            {user.initials}
          </span>
          <div className="min-w-0">
            <p className="text-base font-medium text-ink">{user.name}</p>
            <p className="text-sm text-ink-muted">
              {user.roleLabel} · {user.registration} · {user.detail}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-full bg-selected px-2.5 py-1 text-xs font-medium text-brand">
                Empréstimos ativos: {user.activeLoans} de {user.loanLimit}
              </span>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  user.pendingTone === "danger" ? "bg-danger-100 text-danger-700" : "bg-success-100 text-success-700"
                }`}
              >
                {user.pendingLabel}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <SearchField
          id={id}
          label="Buscar usuário por nome ou matrícula"
          placeholder="Nome ou matrícula"
          value={query}
          onChange={onQueryChange}
          error={error}
          emptyLabel="Nenhum usuário encontrado."
        />
      )}
      {user && error && <FieldError message={error} />}
    </article>
  );
}

function BookSlot({
  id,
  query,
  onQueryChange,
  book,
  error,
}: {
  id: string;
  query: string;
  onQueryChange: (value: string) => void;
  book: LoanBookCard | null;
  error?: string;
}) {
  return (
    <article className={`rounded-lg border bg-surface p-4 ${error ? "border-danger-700" : "border-line"}`}>
      <p className="text-xs text-ink-muted">Livro</p>
      {book ? (
        <div className="mt-3 flex items-center gap-3">
          {book.coverUrl ? (
            // Capa do Storage: imagem simples, sem o otimizador do Next.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={book.coverUrl} alt="" className="h-14 w-10 shrink-0 rounded-sm object-cover" />
          ) : (
            <span className="h-14 w-10 shrink-0 rounded-sm bg-selected" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink">{book.title}</p>
            <p className="text-sm text-ink-muted">
              {book.author} · Tombo {book.code}
            </p>
          </div>
          <SituationBadge situation={book.situation} />
        </div>
      ) : (
        <SearchField
          id={id}
          label="Buscar livro por título ou tombo"
          placeholder="Título ou tombo"
          value={query}
          onChange={onQueryChange}
          error={error}
          emptyLabel="Nenhum livro encontrado."
        />
      )}
      {book && error && <FieldError message={error} />}
    </article>
  );
}

function SearchField({
  id,
  label,
  placeholder,
  value,
  onChange,
  error,
  emptyLabel,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  emptyLabel: string;
}) {
  const showEmpty = value.trim().length > 0 && !error;

  return (
    <div className="mt-3">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <span className="relative block">
        <Search size={18} strokeWidth={1.5} aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input
          id={id}
          type="search"
          value={value}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => onChange(event.target.value)}
          className={`h-12 w-full rounded-md border bg-surface pl-10 pr-3 text-base ${FOCUS} ${
            error ? "border-danger-700" : "border-line"
          }`}
        />
      </span>
      {error && <FieldError id={`${id}-error`} message={error} />}
      {showEmpty && <p className="mt-2 text-sm text-ink-muted">{emptyLabel}</p>}
    </div>
  );
}

function FieldError({ id, message }: { id?: string; message: string }) {
  return (
    <p id={id} role="alert" className="mt-2 flex items-center gap-1 text-xs text-danger-700">
      <CircleAlert size={12} strokeWidth={1.5} aria-hidden />
      {message}
    </p>
  );
}
