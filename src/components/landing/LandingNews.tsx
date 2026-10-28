import { BookOpen } from "lucide-react";
import { NEWS } from "@/content/landing";
import { CONTAINER } from "./styles";

// Seção de novidades (Figma, card 0195: 740 px, título Lora Bold 46, cartões de 378 px com imagem de 240 px).
// Os cartões são fixos por enquanto; o botão "Ver todas" não tem para onde levar até existir uma página de novidades.
// A imagem é ilustrativa (ainda não há capas autorizadas, card 0223).
export function LandingNews() {
  return (
    <section id="novidades" className="bg-page lg:min-h-[740px]">
      <div className={`${CONTAINER} pb-12 pt-[50px]`}>
        <h2 className="text-center font-heading text-[32px] font-bold leading-[55px] md:text-[46px]">Novidades da biblioteca</h2>
        <ul className="mt-[43px] grid gap-8 md:grid-cols-3 md:gap-[33px]">
          {NEWS.map(({ title, text }) => (
            <li key={title}>
              <span aria-hidden className="flex h-[222px] items-center justify-center rounded-lg bg-selected text-brand">
                <BookOpen size={40} strokeWidth={1.5} />
              </span>
              <h3 className="mt-[19px] min-h-[46px] text-xl font-bold leading-[22px]">{title}</h3>
              <p className="mt-8 text-[15px] leading-[21px] text-ink-muted">{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
