import Image from "next/image";
import { BookOpen, Bookmark, Library, type LucideIcon } from "lucide-react";
import { BUTTON_PRIMARY, BUTTON_SOFT, CONTAINER } from "./styles";

interface Diamond {
  icon: LucideIcon;
  // Posição do canto do quadro de 141 px, em px a partir do conteúdo (1200 px) e do topo da seção.
  left: number;
  top: number;
  color: string;
}

// Losangos da apresentação (Figma: quadros de 141×141 em x=1119/1218, y=259/358/459).
const DIAMONDS: Diamond[] = [
  { icon: Bookmark, left: 999, top: 259, color: "bg-navy-700" },
  { icon: BookOpen, left: 1098, top: 358, color: "bg-navy-400" },
  { icon: Library, left: 999, top: 459, color: "bg-navy-900" },
];

// Apresentação (Figma, card 0195: 660 px de altura, título Lora Bold 60/68 em duas cores).
// Foto do palestrante: recorte do Figma (440×660, fundo transparente); origem e autorização em material-de-apoio/fotos-unsplash/CREDITOS.md.
export function LandingHero() {
  return (
    <section id="inicio" className="relative overflow-hidden bg-soft">
      <div className={`${CONTAINER} relative`}>
        <div className="flex flex-col pb-16 pt-12 lg:min-h-[660px] lg:pb-[82px] lg:pt-[90px]">
          <h1 className="max-w-[540px] font-heading text-[40px] font-bold leading-[48px] md:text-[60px] md:leading-[68px]">
            <span className="block text-navy-700">Biblioteca da FAP</span>
            <span className="block text-navy-700">para alunos,</span>
            <span className="block">professores e</span>
            <span className="block">bibliotecários!</span>
          </h1>
          <p className="mt-8 max-w-[500px] text-lg leading-7 text-ink-muted lg:mt-[62px]">
            O FAP Books reúne a consulta ao acervo, empréstimos, reservas, prazos e avisos da Biblioteca Professor
            Renato Gross em um só lugar.
          </p>
          <div className="mt-6 flex flex-wrap gap-4 lg:mt-[22px]">
            <a href="#recursos" className={BUTTON_PRIMARY}>
              Conheça o FAP Books
            </a>
            <a href="#acesso" className={BUTTON_SOFT}>
              Quero acesso
            </a>
          </div>
        </div>

        <div aria-hidden className="absolute inset-y-0 left-8 right-0 hidden lg:block">
          <span className="absolute left-[989px] top-[299px] size-[622px] rounded-full bg-navy-700" />
          <span className="absolute left-[942px] top-[506px] h-px w-[385px] origin-left -rotate-[44deg] bg-link/70" />
          <Image
            src="/fotos/landing-hero-palestrante.webp"
            alt=""
            width={440}
            height={660}
            priority
            className="absolute left-[540px] top-0 h-[660px] w-[440px]"
          />
          {DIAMONDS.map(({ icon: Icon, left, top, color }) => (
            <span
              key={top + left}
              style={{ left, top }}
              className="absolute flex size-[141px] items-center justify-center"
            >
              <span className={`flex size-[100px] rotate-45 items-center justify-center rounded-[18px] text-white shadow-md ${color}`}>
                <Icon size={36} strokeWidth={1.5} className="-rotate-45" />
              </span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
