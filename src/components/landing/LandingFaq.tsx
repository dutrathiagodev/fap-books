import { ChevronDown } from "lucide-react";
import { FAQ } from "@/content/landing";
import { SectionIntro } from "./SectionIntro";

// Perguntas frequentes (Figma, card 0195). <details> abre e fecha sozinho, sem JavaScript.
export function LandingFaq() {
  return (
    <section id="duvidas" className="bg-subtle">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-14 md:px-8 md:py-20">
        <SectionIntro eyebrow="Dúvidas frequentes" title="Perguntas frequentes" />
        <div className="flex flex-col gap-3">
          {FAQ.map(({ question, answer }) => (
            <details key={question} className="group rounded-lg border border-line bg-surface">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg px-5 py-4 font-heading text-base font-semibold focus-visible:outline-2 focus-visible:outline-focus">
                {question}
                <ChevronDown size={18} aria-hidden className="shrink-0 transition-transform group-open:rotate-180" />
              </summary>
              <p className="px-5 pb-4 text-sm text-ink-muted">{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
