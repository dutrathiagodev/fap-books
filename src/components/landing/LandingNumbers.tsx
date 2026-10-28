import { BookOpen, CalendarClock, Clock, Wallet, type LucideIcon } from "lucide-react";
import { NUMBERS } from "@/content/landing";

// Um ícone por número, na mesma ordem de NUMBERS.
const ICONS: LucideIcon[] = [Clock, BookOpen, CalendarClock, Wallet];

// Faixa com as regras do empréstimo (Figma, card 0195).
export function LandingNumbers() {
  return (
    <section aria-label="Regras do empréstimo" className="bg-page">
      <div className="mx-auto w-full max-w-[1200px] px-4 py-10 md:px-8">
        <ul className="grid gap-6 rounded-xl bg-navy-900 px-8 py-8 text-white sm:grid-cols-2 lg:grid-cols-4">
          {NUMBERS.map(({ value, label }, index) => {
            const Icon = ICONS[index];
            return (
              <li key={value} className="flex items-center gap-4">
                <Icon size={28} strokeWidth={1.5} aria-hidden className="shrink-0 text-navy-300" />
                <span>
                  <span className="block font-heading text-h3">{value}</span>
                  <span className="block text-xs text-navy-200">{label}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
