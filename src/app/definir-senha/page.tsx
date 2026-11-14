import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthAside } from "@/components/AuthAside";
import { DefinePasswordForm } from "@/components/DefinePasswordForm";
import { InviteLinkProblem } from "@/components/InviteLinkProblem";
import { LoadingState } from "@/components/LoadingState";
import { parseInviteLink } from "@/domain/auth/invite-token";

// O endereço leva um token de uso único: fora dos buscadores. Os cabeçalhos de "não guardar em cache" e de não enviar
// o endereço a outros sites (Referrer-Policy) vêm do next.config.ts.
export const metadata: Metadata = {
  title: "Sua senha | FAP Books",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// Abrir esta página (GET) NÃO gasta o token do convite: só confere o formato. Antivírus e leitores de e-mail abrem os
// links antes da pessoa; quem gasta o token é a Server Action, no envio do formulário.
async function InviteContent({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const link = parseInviteLink(params.token_hash, params.type);
  if (!link) return <InviteLinkProblem kind="invalid" />;
  return <DefinePasswordForm link={link} />;
}

// Texto do painel azul: convite (primeiro acesso) ou redefinição de senha. Lê o tipo do link, por isso fica no Suspense.
async function AsideMessage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const recovery = parseInviteLink(params.token_hash, params.type)?.type === "recovery";
  return (
    <>
      <h2 className="text-h1-brand">{recovery ? "Escolha uma nova senha" : "Seu acesso à biblioteca está pronto"}</h2>
      <p className="text-base text-navy-200">
        {recovery
          ? "Redefina a sua senha para voltar a consultar o acervo e acompanhar seus empréstimos."
          : "Crie a sua senha para consultar o acervo e acompanhar seus empréstimos."}
      </p>
    </>
  );
}

// Mesmo padrão visual do login (/login): painel navy com foto e o formulário ao lado.
export default function DefinirSenhaPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="flex flex-1 flex-col md:grid md:grid-cols-[5fr_7fr]">
      <AuthAside>
        <Suspense fallback={null}>
          <AsideMessage searchParams={searchParams} />
        </Suspense>
      </AuthAside>
      <section className="flex flex-1 items-center justify-center bg-page px-6 py-10 md:px-12">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <Suspense fallback={<LoadingState />}>
            <InviteContent searchParams={searchParams} />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
