"use client";

import { useActionState } from "react";
import Link from "next/link";
import { PRIVACY_PATH } from "@/domain/access/access-rules";
import { subscribeToNewsletter, type NewsletterState } from "@/app/actions/newsletter";

const INITIAL_STATE: NewsletterState = { status: "idle", message: "" };

const FIELD =
  "h-12 w-full rounded-lg border border-line bg-surface px-4 text-[15px] text-ink placeholder:text-ink-muted focus:border-focus focus:outline-2 focus:outline-focus";

// Formulário da newsletter (Figma, card 0195). Valida no servidor (subscribeToNewsletter) e guarda o consentimento.
export function LandingNewsletter() {
  const [state, formAction, pending] = useActionState(subscribeToNewsletter, INITIAL_STATE);

  return (
    <section id="newsletter" aria-labelledby="newsletter-titulo" className="bg-page border-t border-line">
      <div className="mx-auto grid w-full max-w-[1264px] gap-10 px-4 py-14 md:grid-cols-[340px_1fr] md:px-8 lg:min-h-[340px] lg:py-[56px] lg:pl-[72px]">
        <h2 id="newsletter-titulo" className="text-[22px] font-bold leading-9 text-ink md:text-[26px] lg:pt-2">
          Receba as novidades da biblioteca
        </h2>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="grid gap-[22px] sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="newsletter-nome" className="text-sm">
                Seu nome <span aria-hidden className="text-danger">*</span>
              </label>
              <input
                id="newsletter-nome"
                name="name"
                type="text"
                autoComplete="name"
                placeholder="Digite aqui"
                required
                minLength={2}
                maxLength={100}
                className={FIELD}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="newsletter-email" className="text-sm">
                Seu e-mail <span aria-hidden className="text-danger">*</span>
              </label>
              <input
                id="newsletter-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="Digite aqui"
                required
                maxLength={254}
                className={FIELD}
              />
            </div>
          </div>

          {/* Campo-isca contra robôs: pessoas não veem nem chegam nele pelo teclado. */}
          <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label htmlFor="newsletter-site">Não preencha este campo</label>
            <input id="newsletter-site" name="website" type="text" tabIndex={-1} autoComplete="off" />
          </div>

          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="consent" required className="mt-1 size-4 shrink-0 accent-brand" />
            <span>
              Aceito receber e-mails e avisos da Biblioteca Professor Renato Gross e li a{" "}
              <Link href={PRIVACY_PATH} className="font-medium text-link underline">
                Política de Privacidade e Tratamento de Dados
              </Link>
              .
            </span>
          </label>
          <p className="text-xs text-ink-muted">
            Guardamos só seu nome e e-mail. Para sair da lista, escreva para o encarregado, no e-mail do aviso de
            privacidade.
          </p>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <p
              role={state.status === "error" ? "alert" : "status"}
              className={`min-h-5 text-sm ${state.status === "error" ? "text-danger" : "text-ink"}`}
            >
              {state.message}
            </p>
            <button
              type="submit"
              disabled={pending}
              className="h-12 cursor-pointer rounded-lg bg-brand px-8 text-[15px] font-bold text-on-brand hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-70"
            >
              {pending ? "Enviando..." : "Cadastrar"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
