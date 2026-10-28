"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { RESOURCE_TABS } from "@/content/landing";
import { BUTTON_PRIMARY, CONTAINER } from "./styles";

// Seção "Recursos" (Figma, card 0195: faixa #eff4fa de 640 px, abas de 56 px, quadro de 700×330 e cartão de 720×150).
// Client component só por causa das abas.
export function LandingResources() {
  const [active, setActive] = useState(RESOURCE_TABS[0].id);
  const tab = RESOURCE_TABS.find((t) => t.id === active) ?? RESOURCE_TABS[0];

  return (
    <section id="recursos" className="bg-page py-[60px]">
      <div className="bg-band">
        <div className={`${CONTAINER} grid gap-12 py-[75px] lg:min-h-[640px] lg:grid-cols-[440px_1fr] lg:gap-0 lg:py-0 lg:pl-10`}>
          <div className="flex flex-col items-start lg:pt-[75px]">
            <span className="text-[15px] font-bold leading-[18px]">Nossos recursos</span>
            <h2 className="mt-[15px] font-heading text-[32px] font-bold leading-10 md:text-[42px] md:leading-[50px]">
              <span className="block">Uma plataforma</span>
              <span className="block text-accent">simples, segura e</span>
              <span className="block">acessível para todos</span>
            </h2>
            <p className="mt-[18px] max-w-[340px] text-base leading-[25px] text-ink-muted">
              A melhor experiência de uso para alunos, professores e bibliotecários, com navegação intuitiva em qualquer
              dispositivo.
            </p>
            <a href="#acesso" className={`${BUTTON_PRIMARY} mt-[50px]`}>
              Veja todos os recursos
            </a>
          </div>

          <div className="flex max-w-[720px] flex-col lg:pt-[70px]">
            <div role="tablist" aria-label="Recursos do FAP Books" className="flex flex-wrap gap-[14px]">
              {RESOURCE_TABS.map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  type="button"
                  id={`tab-${t.id}`}
                  aria-selected={t.id === active}
                  aria-controls="recursos-painel"
                  onClick={() => setActive(t.id)}
                  className={`h-14 cursor-pointer rounded-lg border px-[23px] text-[15px] font-bold focus-visible:outline-2 focus-visible:outline-focus ${
                    t.id === active ? "border-brand bg-brand text-on-brand" : "border-line bg-surface hover:bg-selected"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div aria-hidden className="ml-5 mt-[34px] max-w-[700px] rounded-xl border border-link bg-surface p-5">
              <div className="flex h-[290px] flex-col gap-3 rounded-lg bg-selected p-4">
                <span className="flex items-center gap-2 rounded-md bg-surface px-3 py-2 text-sm text-ink-muted">
                  <Search size={14} strokeWidth={1.5} />
                  Todo o acervo
                </span>
                <span className="grid flex-1 grid-cols-4 gap-3">
                  {[0, 1, 2, 3].map((i) => (
                    <span key={i} className="rounded-sm bg-navy-200" />
                  ))}
                </span>
              </div>
            </div>

            <div
              role="tabpanel"
              id="recursos-painel"
              aria-labelledby={`tab-${tab.id}`}
              className="mt-5 min-h-[150px] rounded-xl border border-link bg-surface px-[30px] py-6"
            >
              <h3 className="text-base font-bold leading-[19px]">{tab.label}</h3>
              <p className="mt-3 text-[15px] leading-[18px] text-ink-muted">{tab.text}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
