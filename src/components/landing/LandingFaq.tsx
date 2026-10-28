import { ChevronDown } from "lucide-react";
import { FAQ } from "@/content/landing";

// Perguntas frequentes (Figma, card 0195: 776 px, cartões de 880×80 com 16 px entre eles, perguntas em Lora SemiBold 22/30).
// <details> abre e fecha sozinho, sem JavaScript.
export function LandingFaq() {
  return (
    <section id="duvidas" className="bg-subtle">
      <div className="mx-auto w-full max-w-[1040px] px-4 py-16 md:px-8 lg:py-[87px]">
        <div className="text-center">
          <span className="text-xs font-normal uppercase leading-4 text-accent">Dúvidas frequentes</span>
          <h2 className="mt-3 font-heading text-[28px] font-semibold leading-[44px] md:text-4xl">Perguntas frequentes</h2>
        </div>
        <div className="mx-auto mt-[48px] flex max-w-[880px] flex-col gap-4">
          {FAQ.map(({ question, answer }) => (
            <details key={question} className="group rounded-xl border border-line bg-surface">
              <summary className="flex min-h-20 cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-[29px] font-heading text-lg font-semibold leading-[30px] focus-visible:outline-2 focus-visible:outline-focus md:text-[22px]">
                {question}
                <ChevronDown size={24} aria-hidden className="shrink-0 transition-transform group-open:rotate-180" />
              </summary>
              <p className="px-[29px] pb-5 text-[15px] leading-6 text-ink-muted">{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
