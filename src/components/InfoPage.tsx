import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LANDING_PATH } from "@/domain/access/access-rules";

interface InfoPageProps {
  title: string;
  intro: string;
  children: ReactNode;
}

// Página de texto pública (termos, acessibilidade, suporte): mesma moldura das páginas legais, com leitura confortável.
export function InfoPage({ title, intro, children }: InfoPageProps) {
  return (
    <main className="flex-1 bg-page px-4 py-10 md:py-16">
      <article className="mx-auto flex w-full max-w-[720px] flex-col gap-6">
        <Link
          href={LANDING_PATH}
          className="inline-flex items-center gap-2 text-sm font-medium text-link hover:underline focus-visible:outline-2 focus-visible:outline-focus"
        >
          <ArrowLeft size={16} aria-hidden />
          Voltar ao início
        </Link>
        <header className="flex flex-col gap-3">
          <h1 className="text-h2 md:text-h1">{title}</h1>
          <p className="text-base text-ink-muted">{intro}</p>
        </header>
        <div className="flex flex-col gap-6 text-base [&_h2]:text-h3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1 [&_a]:font-medium [&_a]:text-link [&_a]:underline">
          {children}
        </div>
      </article>
    </main>
  );
}
