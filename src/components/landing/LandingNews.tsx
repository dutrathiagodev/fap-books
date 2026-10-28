import Image from "next/image";
import { NEWS } from "@/content/landing";
import { BUTTON_PRIMARY, CONTAINER } from "./styles";

// Seção de novidades (Figma, card 0195: 740 px, título Lora Bold 46, cartões de 378 px com imagem de 240 px).
// Os cartões são fixos por enquanto; "Ver todas as novidades" leva ao contato da biblioteca até existir uma página de novidades.
// As imagens são capas do Figma (public/capas), na mesma ordem de NEWS.
const NEWS_COVERS = ["dom-casmurro", "pequeno-principe", "memorias-postumas"];

export function LandingNews() {
  return (
    <section id="novidades" className="bg-page lg:min-h-[740px]">
      <div className={`${CONTAINER} pb-12 pt-[50px]`}>
        <h2 className="text-center font-heading text-[32px] font-bold leading-[55px] md:text-[46px]">Novidades da biblioteca</h2>
        <ul className="mt-[43px] grid gap-8 md:grid-cols-3 md:gap-[33px]">
          {NEWS.map(({ title, text }, index) => (
            <li key={title}>
              <span aria-hidden className="flex h-[222px] items-center justify-center rounded-lg bg-selected">
                <Image src={`/capas/landing-${NEWS_COVERS[index]}.webp`} alt="" width={260} height={370} className="h-[190px] w-auto rounded-md shadow-md" />
              </span>
              <h3 className="mt-[19px] min-h-[46px] font-sans text-xl font-bold leading-[22px]">{title}</h3>
              <p className="mt-8 text-[15px] leading-[21px] text-ink-muted">{text}</p>
            </li>
          ))}
        </ul>
        <div className="mt-12 flex justify-center">
          <a href="#contato" className={`${BUTTON_PRIMARY} px-[22px]`}>
            Ver todas as novidades
          </a>
        </div>
      </div>
    </section>
  );
}
