"use client";

import { Eye, EyeOff, Pencil } from "lucide-react";
import type { UserView } from "../types/user-admin";
import { UserRoleBadge, UserStatusBadge } from "./UserBadges";

export interface UsersTableProps {
  users: UserView[];
  onEdit: (user: UserView) => void;
  // Inativar ou reativar, conforme a situação da linha.
  onToggleActive: (user: UserView) => void;
  // Desliga os botões enquanto uma ação está sendo registrada.
  disabled?: boolean;
}

const HEADERS = ["Nome", "Perfil", "Matrícula / cargo", "Status", "Empréstimos", "Ações"] as const;

const ACTION =
  "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-sm font-medium whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-60";

function Person({ user }: { user: UserView }) {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-selected text-xs font-medium text-brand-ink">
        {user.initials}
      </span>
      <div className="min-w-0">
        <p className={`font-medium ${user.active ? "text-ink" : "text-ink-muted"}`}>
          {user.fullName}
          {user.isSelf && <span className="ml-1.5 text-xs font-normal text-ink-muted">(você)</span>}
        </p>
        <p className="text-xs text-ink-muted [overflow-wrap:anywhere]">{user.email}</p>
      </div>
    </div>
  );
}

function Detail({ user }: { user: UserView }) {
  return <span className="text-ink-muted">{user.detail ?? "—"}</span>;
}

// Editar e inativar/reativar. A própria funcionária não se inativa: o botão nem aparece (o banco também recusa).
function Actions({ user, onEdit, onToggleActive, disabled }: { user: UserView } & Omit<UsersTableProps, "users">) {
  return (
    <div className="flex items-center gap-0.5 max-xl:flex-wrap">
      <button
        type="button"
        disabled={disabled}
        aria-label={`Editar ${user.fullName}`}
        onClick={() => onEdit(user)}
        className={`${ACTION} px-2 text-brand-ink hover:bg-selected`}
      >
        <Pencil size={16} strokeWidth={1.5} aria-hidden />
      </button>
      {!user.isSelf &&
        (user.active ? (
          <button
            type="button"
            disabled={disabled}
            aria-label={`Inativar ${user.fullName}`}
            onClick={() => onToggleActive(user)}
            className={`${ACTION} text-danger-700 hover:bg-danger-100 dark:text-red-300 dark:hover:bg-red-400/15`}
          >
            <EyeOff size={14} strokeWidth={1.5} aria-hidden />
            Inativar
          </button>
        ) : (
          <button
            type="button"
            disabled={disabled}
            aria-label={`Reativar ${user.fullName}`}
            onClick={() => onToggleActive(user)}
            className={`${ACTION} text-success-700 hover:bg-success-100 dark:text-green-300 dark:hover:bg-green-400/15`}
          >
            <Eye size={14} strokeWidth={1.5} aria-hidden />
            Reativar
          </button>
        ))}
    </div>
  );
}

// Tabela de usuários (Figma, card 0126) no computador (a partir de 1280 px, onde cabe ao lado do menu) e cartões abaixo disso. Usuário inativo fica esmaecido (nome em cinza, sem baixar o
// contraste do texto), com a etiqueta Inativo. Só desenha: quem decide é o banco.
export function UsersTable({ users, onEdit, onToggleActive, disabled = false }: UsersTableProps) {
  const actions = { onEdit, onToggleActive, disabled };

  return (
    <div>
      <div className="hidden overflow-hidden rounded-lg border border-line bg-surface xl:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-subtle text-ink">
            <tr>
              {HEADERS.map((header) => (
                <th key={header} scope="col" className="px-3 py-3 font-medium whitespace-nowrap">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-line hover:bg-selected">
                <td className="px-3 py-3"><Person user={user} /></td>
                <td className="px-3 py-3"><UserRoleBadge role={user.role} label={user.roleLabel} /></td>
                <td className="px-3 py-3"><Detail user={user} /></td>
                <td className="px-3 py-3"><UserStatusBadge active={user.active} /></td>
                <td className="px-3 py-3 tabular-nums">{user.openLoans}</td>
                <td className="px-3 py-3"><Actions user={user} {...actions} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-3 xl:hidden">
        {users.map((user) => (
          <li key={user.id} className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <Person user={user} />
              <UserStatusBadge active={user.active} />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <UserRoleBadge role={user.role} label={user.roleLabel} />
              <Detail user={user} />
            </div>
            <p className="text-sm text-ink-muted">
              Empréstimos em aberto: <span className="font-medium text-ink tabular-nums">{user.openLoans}</span>
            </p>
            <Actions user={user} {...actions} />
          </li>
        ))}
      </ul>
    </div>
  );
}
