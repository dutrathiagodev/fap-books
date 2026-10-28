import { ArrowRight, GraduationCap, IdCard, Library, type LucideIcon } from "lucide-react";
import { PROFILES } from "@/content/landing";
import { SectionIntro } from "./SectionIntro";

// Um ícone por perfil, na mesma ordem de PROFILES.
const ICONS: LucideIcon[] = [GraduationCap, IdCard, Library];
// O cartão do meio (professores) vem em destaque, como no Figma.
const HIGHLIGHTED_INDEX = 1;

// Seção "Perfis" (Figma, card 0195): o que o FAP Books faz por cada tipo de pessoa.
export function LandingProfiles() {
  return (
    <section id="perfis" className="bg-page">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-12 px-4 py-16 md:px-8 md:py-20">
        <SectionIntro
          accent="A melhor experiência para"
          title="encontrar e emprestar livros!"
          text="O FAP Books foi pensado para facilitar a rotina de quem estuda, ensina e cuida do acervo: busca rápida, prazos claros e avisos automáticos."
        />
        <ul className="grid gap-6 md:grid-cols-3">
          {PROFILES.map(({ eyebrow, title, text }, index) => {
            const Icon = ICONS[index];
            const highlight = index === HIGHLIGHTED_INDEX;
            return (
            <li
              key={title}
              className={`flex flex-col items-center gap-4 rounded-lg border bg-surface p-8 text-center shadow-sm ${
                highlight ? "border-link" : "border-line"
              }`}
            >
              <span aria-hidden className="flex size-24 items-center justify-center rounded-2xl bg-selected text-brand">
                <span className="flex size-14 rotate-45 items-center justify-center rounded-xl bg-brand text-on-brand">
                  <Icon size={26} strokeWidth={1.5} className="-rotate-45" />
                </span>
              </span>
              <div>
                <span className="block text-xs font-medium uppercase tracking-wide text-link">{eyebrow}</span>
                <h3 className="font-heading text-h3">{title}</h3>
              </div>
              <p className="text-sm text-ink-muted">{text}</p>
              {highlight && <ArrowRight size={20} strokeWidth={1.5} aria-hidden className="mt-auto text-link" />}
            </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
