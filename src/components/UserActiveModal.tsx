"use client";

import { useState } from "react";
import type { UserView } from "../types/user-admin";
import { FieldError } from "./FieldError";
import { Modal } from "./Modal";

export interface UserActiveModalProps {
  // A pessoa que vai ser inativada ou reativada; nula = modal fechado. Quem decide é a situação atual dela.
  user: UserView | null;
  // Veio do servidor: a pessoa passou a ter empréstimo em aberto depois que a lista foi carregada.
  forceOpenLoansWarning?: boolean;
  pending?: boolean;
  error?: string;
  // confirmOpenLoans = a funcionária marcou que entende que há empréstimo em aberto.
  onConfirm: (confirmOpenLoans: boolean) => void;
  onClose: () => void;
}

function loansText(count: number): string {
  return count === 1 ? "1 empréstimo em aberto" : `${count} empréstimos em aberto`;
}

// Conteúdo do modal. Fica à parte para o "entendo" voltar desmarcado a cada pessoa (o pai troca a "key").
function Body({ user, forceOpenLoansWarning, pending, error, onConfirm, onClose }: UserActiveModalProps & { user: UserView }) {
  const [understood, setUnderstood] = useState(false);
  const reactivating = !user.active;
  // Aviso de empréstimo em aberto: só ao inativar. A decisão (avisar e exigir confirmação, não bloquear) está no PR 0088.
  const warn = !reactivating && (user.openLoans > 0 || Boolean(forceOpenLoansWarning));

  return (
    <Modal
      open
      destructive={!reactivating}
      title={reactivating ? "Reativar usuário?" : "Inativar usuário?"}
      description={
        reactivating
          ? `${user.fullName} volta a entrar no sistema e a pegar livros.`
          : "Inativar impede novos empréstimos e mantém o histórico."
      }
      confirmLabel={pending ? "Salvando…" : reactivating ? "Reativar usuário" : "Inativar usuário"}
      confirmVariant={reactivating ? "primary" : "danger"}
      confirmDisabled={pending || (warn && !understood)}
      onConfirm={() => onConfirm(warn && understood)}
      onClose={() => {
        if (!pending) onClose();
      }}
    >
      <dl className="flex flex-col gap-2 rounded-lg bg-subtle p-4 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-ink-muted">Usuário</dt>
          <dd className="text-right font-medium text-ink">{user.fullName}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-muted">Perfil</dt>
          <dd className="text-right font-medium text-ink">{user.roleLabel}</dd>
        </div>
      </dl>
      {!reactivating && (
        <p className="mt-3 text-sm text-ink-muted">
          A pessoa deixa de entrar no sistema. As reservas em fila são canceladas; os livros que ela tem podem ser devolvidos no balcão.
        </p>
      )}
      {warn && (
        <div role="alert" className="mt-3 rounded-lg border border-warning-700 bg-warning-100 p-3 text-sm text-warning-700 dark:border-amber-400/40 dark:bg-amber-400/15 dark:text-amber-300">
          <p className="font-medium">
            {user.openLoans > 0 ? `Esta pessoa tem ${loansText(user.openLoans)}.` : "Esta pessoa tem empréstimo em aberto."}
          </p>
          <label className="mt-2 flex cursor-pointer items-start gap-2 text-ink">
            <input
              type="checkbox"
              checked={understood}
              disabled={pending}
              onChange={(event) => setUnderstood(event.target.checked)}
              className="mt-0.5 size-4 shrink-0 cursor-pointer accent-brand"
            />
            Entendo: o livro continua emprestado até ser devolvido no balcão.
          </label>
        </div>
      )}
      {error && <FieldError message={error} className="mt-3" />}
    </Modal>
  );
}

// Modal de inativação e de reativação (Figma, card 0126: "Inativar impede novos empréstimos e mantém o histórico").
// Com empréstimo em aberto, inativar exige marcar a confirmação; o servidor também exige.
export function UserActiveModal(props: UserActiveModalProps) {
  if (!props.user) return null;
  return <Body key={props.user.id} {...props} user={props.user} />;
}
