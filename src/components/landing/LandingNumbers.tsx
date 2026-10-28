import { BookOpen, CalendarClock, Clock, Wallet, type LucideIcon } from "lucide-react";
import { NUMBERS } from "@/content/landing";
import { CONTAINER } from "./styles";

// Um ícone por número, na mesma ordem de NUMBERS.
const ICONS: LucideIcon[] = [Clock, BookOpen, CalendarClock, Wallet];

// Faixa com as regras do empréstimo (Figma, card 0195: 300 px, faixa de 1200×200 em #031f45, colunas de 290 px).
export function LandingNumbers() {
  return (
    <section aria-label="Regras do empréstimo" className="bg-page">
      <div className={`${CONTAINER} py-10`}>
        <ul className="grid gap-8 rounded-xl bg-feature dark:border dark:border-navy-300 px-8 py-8 text-white sm:grid-cols-2 lg:h-[200px] lg:grid-cols-[repeat(4,290px)] lg:items-center lg:gap-0 lg:py-0 lg:pl-[68px]">
          {NUMBERS.map(({ value, label }, index) => {
            const Icon = ICONS[index];
            return (
              <li key={value} className="flex items-center gap-4">
                <Icon size={28} strokeWidth={1.5} aria-hidden className="shrink-0 text-navy-300" />
                <span>
                  <span className="block text-[32px] font-bold leading-[39px]">{value}</span>
                  <span className="block max-w-[150px] text-sm leading-5 text-navy-200">{label}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
