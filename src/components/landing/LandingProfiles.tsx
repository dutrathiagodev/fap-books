import { ArrowRight, GraduationCap, IdCard, Library, type LucideIcon } from "lucide-react";
import { PROFILES } from "@/content/landing";
import { CONTAINER } from "./styles";

// Um ícone por perfil, na mesma ordem de PROFILES.
const ICONS: LucideIcon[] = [GraduationCap, IdCard, Library];
// O cartão do meio (professores) vem em destaque, como no Figma.
const HIGHLIGHTED_INDEX = 1;

// Seção "Perfis" (Figma, card 0195: título Lora Bold 40/50, cartões de 378×414 com 33 px entre eles).
export function LandingProfiles() {
  return (
    <section id="perfis" className="bg-page">
      <div className={`${CONTAINER} pb-14 pt-[50px]`}>
        <h2 className="text-center font-heading text-[28px] font-bold leading-9 md:text-[40px] md:leading-[50px]">
          <span className="block">A melhor experiência para</span>
          <span className="block text-accent">encontrar e emprestar livros!</span>
        </h2>
        <p className="mx-auto mt-[22px] max-w-[721px] text-center text-[17px] leading-[26px] text-ink-muted">
          O FAP Books foi pensado para facilitar a rotina de quem estuda, ensina e cuida do acervo: busca rápida, prazos
          claros e avisos automáticos.
        </p>

        <ul className="mt-[30px] grid gap-8 md:grid-cols-3 md:gap-[33px]">
          {PROFILES.map(({ eyebrow, title, text }, index) => {
            const Icon = ICONS[index];
            const highlight = index === HIGHLIGHTED_INDEX;
            return (
              <li
                key={title}
                className={`relative flex min-h-[414px] flex-col items-center rounded-xl border bg-surface px-8 pb-16 pt-9 text-center ${
                  highlight ? "border-link" : "border-line"
                }`}
              >
                <span aria-hidden className="relative flex h-[140px] w-[160px] items-center justify-center rounded-xl bg-selected">
                  <span className="absolute right-[7px] top-[7px] size-[30px] rotate-45 rounded-[7px] bg-navy-300" />
                  <span className="absolute bottom-[7px] left-[10px] size-[22px] rotate-45 rounded-[5px] bg-navy-400" />
                  <span className="flex size-[78px] rotate-45 items-center justify-center rounded-[17px] bg-navy-900">
                    <Icon size={36} strokeWidth={1.5} className="-rotate-45 text-white" />
                  </span>
                </span>
                <span className="mt-[31px] text-[13px] font-bold uppercase leading-4 text-accent">{eyebrow}</span>
                <h3 className="mt-[3px] font-heading text-[28px] font-bold leading-9">{title}</h3>
                <p className="mt-[19px] max-w-[290px] text-[15px] leading-[23px] text-ink-muted">{text}</p>
                {highlight && (
                  <ArrowRight size={20} strokeWidth={1.5} aria-hidden className="absolute bottom-5 left-[22px] text-link" />
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
