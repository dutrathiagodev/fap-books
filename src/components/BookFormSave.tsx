"use client";

import Link from "next/link";
import { ArrowLeft, Check, CircleAlert, CircleCheck } from "lucide-react";
import { ACERVO_PATH } from "@/domain/access/access-rules";
import { EmptyState } from "./EmptyState";
import { PageHeader } from "./PageHeader";

export type BookFormMode = "create" | "edit";
export type BookSaveStatus = "idle" | "saving" | "success" | "error";

export interface BookFormSaveProps {
  mode?: BookFormMode;
  // "saving" trava os botões, "success" mostra o aviso e "error" o alerta.
  status?: BookSaveStatus;
  error?: string;
  successMessage?: string;
  // Sem livro no modo edição, o bloco fica vazio.
  empty?: boolean;
  cancelHref?: string;
  onSave?: () => void;
  onCancel?: () => void;
  children?: React.ReactNode;
}

const COPY = {
  create: {
    title: "Cadastro de livro",
    crumb: "Novo livro",
    success: "Livro cadastrado.",
  },
  edit: {
    title: "Editar livro",
    crumb: "Editar livro",
    success: "Livro salvo com sucesso.",
  },
} as const;

const DESCRIPTION = "Preencha as informações catalográficas ou use a importação de planilha.";

const BUTTON =
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-70 md:w-auto";

// Cabeçalho, cartão, feedback e rodapé do formulário de livro (Figma, card 0117), nos modos cadastro e edição.
// A página entrega os campos em children e informa o modo e o resultado. O frame não traz tela de "Editar livro":
// o título, o texto de sucesso e o vazio do modo edição seguem o cadastro até o Figma ganhar esse frame.
export function BookFormSave({
  mode = "create",
  status = "idle",
  error = "Não foi possível salvar o livro.",
  successMessage,
  empty = false,
  cancelHref = ACERVO_PATH,
  onSave,
  onCancel,
  children,
}: BookFormSaveProps) {
  const copy = COPY[mode];
  const saving = status === "saving";
  const message = successMessage ?? copy.success;

  return (
    <div>
      <PageHeader
        title={copy.title}
        breadcrumbs={[{ label: "Acervo" }, { label: copy.crumb }]}
        description={DESCRIPTION}
        action={
          <Link
            href={cancelHref}
            className="inline-flex h-11 items-center gap-2 rounded-md border border-line bg-surface px-4 text-sm font-medium text-brand hover:bg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <ArrowLeft size={16} strokeWidth={1.5} aria-hidden />
            Voltar ao acervo
          </Link>
        }
      />

      {empty ? (
        <EmptyState title="Nenhum livro para editar." description="Esse livro não está no acervo." />
      ) : (
        <div aria-busy={saving} className="max-w-5xl">
          <section className="rounded-lg border border-line bg-surface p-4 shadow-sm md:p-7">{children}</section>
          {status === "success" && (
            <p
              role="status"
              className="mt-6 flex w-full items-center gap-2 rounded-md border border-success-700 bg-success-100 px-3 py-2 text-sm text-success-700 shadow-md md:ml-auto md:w-fit"
            >
              <CircleCheck size={16} strokeWidth={1.5} aria-hidden />
              {message}
            </p>
          )}
          {status === "error" && (
            <p role="alert" className="mt-6 flex items-start gap-2 rounded-md border border-danger-700 bg-danger-100 px-3 py-2 text-sm text-danger-700">
              <CircleAlert size={16} strokeWidth={1.5} aria-hidden className="mt-0.5 shrink-0" />
              {error}
            </p>
          )}
          {/* Rodapé fora do cartão, como no frame. No celular o frame não mostra a nota e põe Salvar acima de Cancelar. */}
          <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-xs text-ink-muted max-md:hidden">* Campos de preenchimento obrigatório</p>
            <div className="flex flex-col-reverse gap-2 md:flex-row">
              {onCancel ? (
                <button type="button" onClick={onCancel} disabled={saving} className={`${BUTTON} border border-line bg-surface text-ink hover:bg-subtle`}>
                  Cancelar
                </button>
              ) : saving ? (
                <span aria-disabled="true" className={`${BUTTON} border border-line bg-surface text-ink opacity-70`}>
                  Cancelar
                </span>
              ) : (
                <Link href={cancelHref} className={`${BUTTON} border border-line bg-surface text-ink hover:bg-subtle`}>
                  Cancelar
                </Link>
              )}
              <button type="button" onClick={onSave} disabled={saving} className={`${BUTTON} bg-brand text-on-brand hover:bg-brand-hover`}>
                {saving ? (
                  "Salvando..."
                ) : (
                  <>
                    <Check size={16} strokeWidth={1.5} aria-hidden />
                    Salvar livro
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
