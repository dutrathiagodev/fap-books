"use client";

import { useRef, useState, useTransition } from "react";
import { Toast } from "@/components/Toast";
import { UserActiveModal } from "@/components/UserActiveModal";
import { UserEditModal } from "@/components/UserEditModal";
import { UsersTable } from "@/components/UsersTable";
import type { UserEditErrors, UserEditValues } from "@/domain/users/user-edit-rules";
import type { UserAdminResult, UserView } from "@/types/user-admin";
import { setUserActiveAction, updateUserAction } from "./actions";

interface ToastState {
  message: string;
  tone: "success" | "error";
}

const NETWORK_ERROR = "Não foi possível concluir agora. Confira a conexão e tente de novo.";

// Erros do banco que apontam um campo do formulário (além da mensagem geral).
const FIELD_OF_CODE: Record<string, keyof UserEditErrors> = {
  registration_taken: "registration",
  invalid_registration: "registration",
  invalid_course: "course",
  invalid_name: "fullName",
  invalid_phone: "phone",
  job_title_required: "jobTitle",
};

// Lista de usuários com a edição e a inativação: abre o modal, chama a Server Action e avisa o resultado com um toast.
// Depois do sucesso a Server Action atualiza a rota e a linha já aparece com os dados novos.
export function UsersDesk({ users }: { users: UserView[] }) {
  const [editing, setEditing] = useState<UserView | null>(null);
  const [toggling, setToggling] = useState<UserView | null>(null);
  const [error, setError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<UserEditErrors>({});
  // O servidor avisou de empréstimo em aberto que a tela ainda não conhecia.
  const [loansWarning, setLoansWarning] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [pending, startTransition] = useTransition();
  // Uma chave de idempotência (uuid) por ação: o clique duplo e a nova tentativa depois de falha de rede enviam a MESMA
  // chave e o banco registra uma vez só. Só muda ao abrir outra ação ou depois de um erro de regra.
  const key = useRef<string | null>(null);

  function reset(next: { edit?: UserView; toggle?: UserView }) {
    key.current = crypto.randomUUID();
    setError(undefined);
    setFieldErrors({});
    setLoansWarning(false);
    setEditing(next.edit ?? null);
    setToggling(next.toggle ?? null);
  }

  function close() {
    setEditing(null);
    setToggling(null);
  }

  // Resultado comum às duas ações. Devolve true quando deu certo.
  function settle(result: UserAdminResult | null, successMessage: string): boolean {
    if (!result) {
      setError(NETWORK_ERROR);
      return false;
    }
    if (!result.ok) {
      if (result.final) key.current = null;
      if (result.code === "has_open_loans") setLoansWarning(true);
      const field = result.code ? FIELD_OF_CODE[result.code] : undefined;
      setFieldErrors(field ? { [field]: result.message } : {});
      setError(result.message);
      return false;
    }
    key.current = null;
    close();
    setToast({ message: successMessage, tone: "success" });
    return true;
  }

  function save(values: UserEditValues) {
    const user = editing;
    if (!user || pending) return;
    key.current ??= crypto.randomUUID();
    const idempotencyKey = key.current;
    setError(undefined);
    setFieldErrors({});

    startTransition(async () => {
      const result = await updateUserAction(user.id, values, idempotencyKey).catch(() => null);
      settle(result, `Dados de ${values.fullName.trim()} atualizados.`);
    });
  }

  function confirmActive(confirmOpenLoans: boolean) {
    const user = toggling;
    if (!user || pending) return;
    key.current ??= crypto.randomUUID();
    const idempotencyKey = key.current;
    const activating = !user.active;
    setError(undefined);

    startTransition(async () => {
      const result = await setUserActiveAction(user.id, activating, confirmOpenLoans, idempotencyKey).catch(() => null);
      settle(result, activating ? `${user.fullName} foi reativado(a).` : `${user.fullName} foi inativado(a). O histórico foi mantido.`);
    });
  }

  return (
    <>
      <UsersTable users={users} onEdit={(user) => reset({ edit: user })} onToggleActive={(user) => reset({ toggle: user })} disabled={pending} />
      <UserEditModal user={editing} pending={pending} error={error} fieldErrors={fieldErrors} onSave={save} onClose={close} />
      <UserActiveModal user={toggling} forceOpenLoansWarning={loansWarning} pending={pending} error={error} onConfirm={confirmActive} onClose={close} />
      {toast && <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}
    </>
  );
}
