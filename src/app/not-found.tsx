import type { Metadata } from "next";
import Link from "next/link";
import { SearchX } from "lucide-react";
import { EmptyState, Logo } from "@/components";

export const metadata: Metadata = { title: "Página não encontrada | FAP Books" };

// 404 de todo o site (também vale para livro que não existe): em português, no tom do sistema, com saída para o início.
// O endereço "/" leva a pessoa à landing (visitante) ou à própria área (logada).
export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-8 p-6">
      <h1 className="sr-only">Página não encontrada</h1>
      <Logo width={140} />
      <EmptyState
        icon={SearchX}
        title="Página não encontrada"
        description="O endereço não existe ou o conteúdo foi retirado. Confira o link ou volte ao início."
        action={
          <Link
            href="/"
            className="inline-flex cursor-pointer rounded-md bg-brand px-5 py-2 text-sm font-medium text-on-brand hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            Voltar ao início
          </Link>
        }
      />
    </main>
  );
}
