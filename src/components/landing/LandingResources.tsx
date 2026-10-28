"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { RESOURCE_TABS } from "@/content/landing";

// Seção "Recursos" (Figma, card 0195): abas com o que a plataforma faz. Client component só por causa das abas.
export function LandingResources() {
  const [active, setActive] = useState(RESOURCE_TABS[0].id);
  const tab = RESOURCE_TABS.find((t) => t.id === active) ?? RESOURCE_TABS[0];

  return (
    <section id="recursos" className="bg-subtle">
      <div className="mx-auto grid w-full max-w-[1200px] items-center gap-12 px-4 py-16 md:grid-cols-[0.9fr_1.1fr] md:px-8 md:py-24">
        <div className="flex flex-col items-start gap-6">
          <span className="text-xs font-medium uppercase tracking-wide text-ink">Nossos recursos</span>
          <h2 className="font-heading text-h2 text-brand md:text-h1">
            Uma plataforma <span className="text-link">simples, segura e</span> acessível para todos
          </h2>
          <p className="text-base text-ink-muted">
            A melhor experiência de uso para alunos, professores e bibliotecários, com navegação intuitiva em qualquer
            dispositivo.
          </p>
          <a
            href="#acesso"
            className="inline-flex items-center rounded-md bg-brand px-6 py-3 text-sm font-medium text-on-brand hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-focus"
          >
            Veja todos os recursos
          </a>
        </div>

        <div className="flex flex-col gap-4">
          <div role="tablist" aria-label="Recursos do FAP Books" className="flex flex-wrap gap-2">
            {RESOURCE_TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                type="button"
                id={`tab-${t.id}`}
                aria-selected={t.id === active}
                aria-controls="recursos-painel"
                onClick={() => setActive(t.id)}
                className={`cursor-pointer rounded-md border px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-focus ${
                  t.id === active ? "border-brand bg-brand text-on-brand" : "border-line bg-surface hover:bg-selected"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div aria-hidden className="rounded-lg border border-link bg-surface p-4 shadow-md">
            <div className="mb-3 flex items-center gap-2 rounded-md bg-subtle px-3 py-2 text-sm text-ink-muted">
              <Search size={14} strokeWidth={1.5} />
              Todo o acervo
            </div>
            <div className="grid grid-cols-4 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className="flex flex-col gap-2">
                  <span className="aspect-[2/3] rounded-sm bg-navy-100" />
                  <span className="h-2 rounded bg-line" />
                  <span className="h-2 w-2/3 rounded bg-line" />
                </span>
              ))}
            </div>
          </div>

          <div
            role="tabpanel"
            id="recursos-painel"
            aria-labelledby={`tab-${tab.id}`}
            className="rounded-lg border border-link bg-surface p-5"
          >
            <h3 className="font-heading text-h3">{tab.label}</h3>
            <p className="mt-1 text-sm text-ink-muted">{tab.text}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
