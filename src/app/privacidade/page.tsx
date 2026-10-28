import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { LOGIN_PATH } from "@/domain/access/access-rules";

export const metadata: Metadata = { title: "Aviso de privacidade | FAP Books" };

// Contato do encarregado pelo tratamento dos dados (docs/database/lgpd.md).
const PRIVACY_EMAIL = "thiago_dutra@educadventista.org";

// Aviso de privacidade (Figma, card 0219): texto curto e claro, público. O detalhe técnico fica em docs/database/lgpd.md.
export default function PrivacidadePage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-page px-4 py-10">
      <article className="flex w-full max-w-[520px] flex-col gap-4 rounded-lg border border-line bg-surface p-8 shadow-md">
        <span className="flex size-12 items-center justify-center rounded-full bg-selected text-brand">
          <ShieldCheck size={24} aria-hidden />
        </span>
        <h1 className="text-h3">Como usamos seus dados</h1>
        <p className="text-base">
          O FAP Books guarda seu nome, e-mail e o histórico dos seus empréstimos, reservas e multas, só para a
          biblioteca controlar o acervo e atender você. Só você e a equipe da biblioteca veem esses dados. Guardamos por
          até 5 anos depois da sua última movimentação e depois os tornamos anônimos.
        </p>
        <p className="text-base">
          Se você tem menos de 18 anos, seu pai, mãe ou responsável também pode pedir acesso, correção ou eliminação dos
          seus dados por você.
        </p>
        <p className="text-base">
          Para ver, corrigir ou pedir a eliminação dos seus dados, escreva para{" "}
          <a href={`mailto:${PRIVACY_EMAIL}`} className="font-medium text-link underline">
            {PRIVACY_EMAIL}
          </a>
          .
        </p>
        <p className="text-sm text-ink-muted">
          Encarregado pelo tratamento dos dados: Thiago.
          <br />
          Respondemos em até 15 dias.
        </p>
        <Link href={LOGIN_PATH} className="mt-2 text-sm font-medium text-link underline">
          Voltar ao login
        </Link>
      </article>
    </main>
  );
}
