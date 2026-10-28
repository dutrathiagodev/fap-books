import { BookOpen } from "lucide-react";
import { NEWS } from "@/content/landing";
import { SectionIntro } from "./SectionIntro";

// Seção de novidades (Figma, card 0195). Os cartões são fixos por enquanto; o botão "Ver todas" entra
// quando existir uma página de novidades. A imagem é ilustrativa (ainda não há capas autorizadas, card 0223).
export function LandingNews() {
  return (
    <section id="novidades" className="bg-page">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-10 px-4 py-14 md:px-8 md:py-20">
        <SectionIntro title="Novidades da biblioteca" />
        <ul className="grid gap-6 md:grid-cols-3">
          {NEWS.map(({ title, text }) => (
            <li key={title} className="flex flex-col gap-3">
              <span aria-hidden className="flex h-44 items-center justify-center rounded-lg bg-selected text-brand">
                <BookOpen size={40} strokeWidth={1.5} />
              </span>
              <h3 className="text-base font-semibold">{title}</h3>
              <p className="text-sm text-ink-muted">{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
