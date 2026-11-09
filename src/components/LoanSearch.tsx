"use client";

import { Search } from "lucide-react";
import type { ReactNode } from "react";
import type { BookSituation } from "@/types/book";
import { BookCover } from "./BookCover";
import { FieldError } from "./FieldError";
import { TextField } from "./TextField";
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
  // Resultados da busca (a página desenha as opções clicáveis). Com opções, o "nenhum encontrado" não aparece.
  userOptions?: ReactNode;
  bookQuery: string;
  onBookQueryChange: (value: string) => void;
  book: LoanBookCard | null;
  bookError?: string;
  bookOptions?: ReactNode;
}

// Busca de usuário e de livro do balcão (Figma, card 0130, frame 0129).
// Só desenha: a página busca e entrega o cartão, o vazio ou o erro.
export function LoanSearch({
  idPrefix = "loan",
  userQuery,
  onUserQueryChange,
  user,
  userError,
  userOptions,
  bookQuery,
  onBookQueryChange,
  book,
  bookError,
  bookOptions,
}: LoanSearchProps) {
  return (
    <div className="flex flex-col gap-4">
      <UserSlot
        id={`${idPrefix}-user`}
        query={userQuery}
        onQueryChange={onUserQueryChange}
        user={user}
        error={userError}
        options={userOptions}
      />
      <BookSlot
        id={`${idPrefix}-book`}
        query={bookQuery}
        onQueryChange={onBookQueryChange}
        book={book}
        error={bookError}
        options={bookOptions}
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
  options,
}: {
  id: string;
  query: string;
  onQueryChange: (value: string) => void;
  user: LoanUserCard | null;
  error?: string;
  options?: ReactNode;
}) {
  const danger = Boolean(error) || user?.pendingTone === "danger";

  return (
    <article className={`rounded-lg border bg-surface p-4 ${danger ? "border-danger-700" : "border-line"}`}>
      <p className="text-xs text-ink-muted">Usuário</p>
      {user ? (
        <div className="mt-3 flex gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-selected text-sm font-medium text-brand-ink">
            {user.initials}
          </span>
          <div className="min-w-0">
            <p className="text-base font-medium text-ink">{user.name}</p>
            <p className="text-sm text-ink-muted">
              {user.roleLabel} · {user.registration} · {user.detail}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-full bg-selected px-2.5 py-1 text-xs font-medium text-brand-ink">
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
          options={options}
        />
      )}
      {user && error && <FieldError message={error} className="mt-2" />}
    </article>
  );
}

function BookSlot({
  id,
  query,
  onQueryChange,
  book,
  error,
  options,
}: {
  id: string;
  query: string;
  onQueryChange: (value: string) => void;
  book: LoanBookCard | null;
  error?: string;
  options?: ReactNode;
}) {
  return (
    <article className={`rounded-lg border bg-surface p-4 ${error ? "border-danger-700" : "border-line"}`}>
      <p className="text-xs text-ink-muted">Livro</p>
      {book ? (
        <div className="mt-3 flex items-center gap-3">
          <BookCover
            url={book.coverUrl}
            className="h-14 w-10 shrink-0 rounded-sm object-cover"
            fallback={<span className="h-14 w-10 shrink-0 rounded-sm bg-selected" />}
          />
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
          label="Buscar livro por título, autor, ISBN ou tombo"
          placeholder="Buscar livro por título, autor, ISBN ou tombo"
          value={query}
          onChange={onQueryChange}
          error={error}
          emptyLabel="Nenhum livro encontrado."
          options={options}
        />
      )}
      {book && error && <FieldError message={error} className="mt-2" />}
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
  options,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  emptyLabel: string;
  options?: ReactNode;
}) {
  const showEmpty = value.trim().length > 0 && !error && !options;

  return (
    <div className="mt-3">
      <TextField
        id={id}
        name={id}
        label={label}
        hideLabel
        type="search"
        placeholder={placeholder}
        value={value}
        error={error}
        leadingIcon={Search}
        onChange={onChange}
      />
      {options}
      {showEmpty && <p className="mt-2 text-sm text-ink-muted">{emptyLabel}</p>}
    </div>
  );
}
