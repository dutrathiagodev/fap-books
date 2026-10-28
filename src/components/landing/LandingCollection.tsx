import { BookOpen } from "lucide-react";
import { COURSES } from "@/content/landing";
import { CONTAINER } from "./styles";

// Capas ilustrativas: ainda não há capas reais autorizadas no projeto (card 0223), então usamos cores da marca.
const COVERS = [
  "bg-amber-300",
  "bg-pink-300",
  "bg-stone-300",
  "bg-white",
  "bg-stone-200",
  "bg-pink-200",
  "bg-amber-200",
  "bg-stone-400",
  "bg-sky-200",
  "bg-pink-300",
  "bg-stone-300",
  "bg-amber-300",
];

// Seção do acervo (Figma, card 0195: 760 px, fundo #031f45, capas de 130×185 e losango "3 livros") e a faixa dos cursos.
export function LandingCollection() {
  return (
    <>
      <section id="quem-somos" className="relative overflow-hidden bg-navy-925 text-white">
        <span aria-hidden className="absolute left-1/2 top-0 hidden h-[95px] w-[190px] -translate-x-1/2 rounded-b-full bg-page lg:block" />
        <span aria-hidden className="absolute bottom-0 left-1/2 hidden h-[95px] w-[190px] -translate-x-1/2 rounded-t-full bg-page lg:block" />

        <div className={`${CONTAINER} grid items-center gap-12 py-16 lg:min-h-[760px] lg:grid-cols-[586px_1fr] lg:gap-[34px] lg:py-0`}>
          <div aria-hidden className="relative mx-auto grid w-full max-w-[586px] grid-cols-4 gap-x-[22px] gap-y-[15px] lg:mx-0 lg:ml-5">
            {COVERS.map((color, index) => (
              <span
                key={index}
                className={`flex aspect-[130/185] items-center justify-center rounded-lg text-navy-950 shadow-md ${color}`}
              >
                <BookOpen size={20} strokeWidth={1.5} />
              </span>
            ))}
            <span className="absolute left-1/2 top-1/2 flex size-[300px] -translate-x-1/2 -translate-y-1/2 rotate-45 items-center justify-center rounded-[36px] bg-navy-400 shadow-lg">
              <span className="-rotate-45 text-center text-navy-950">
                <span className="block text-[40px] font-bold leading-[48px]">3 livros</span>
                <span className="mx-auto block max-w-[210px] text-[15px] leading-[18px]">por pessoa, ao mesmo tempo</span>
              </span>
            </span>
          </div>

          <div className="flex flex-col items-start">
            <h2 className="font-heading text-[32px] font-bold leading-10 md:text-[48px] md:leading-[58px]">
              <span className="block text-navy-400">Seu acervo</span>
              <span className="block">completo, diversificado</span>
              <span className="block">e sempre atualizado!</span>
            </h2>
            <p className="mt-6 max-w-[550px] text-base leading-[26px] text-navy-100 lg:mt-[46px]">
              A Biblioteca Professor Renato Gross reúne livros para todas as áreas dos cursos da FAP. No FAP Books você
              consulta o acervo, vê a situação de cada exemplar e acompanha os seus empréstimos.
            </p>
            <a
              href="#acesso"
              className="mt-8 inline-flex h-12 items-center justify-center rounded-md bg-navy-900 px-[22px] text-[15px] font-bold text-white hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:mt-[56px]"
            >
              Conheça o nosso acervo
            </a>
          </div>
        </div>
      </section>

      <section id="acervo" className="bg-page">
        <div className={`${CONTAINER} pb-9 pt-[46px] text-center`}>
          <h2 className="font-heading text-[28px] font-bold leading-[44px] md:text-[34px]">Explore o acervo por curso</h2>
          <ul className="mx-auto mt-10 flex max-w-[700px] flex-wrap justify-center gap-x-4 gap-y-[18px]">
            {COURSES.map((course) => (
              <li
                key={course}
                className="flex h-12 items-center rounded-full border border-line bg-surface px-[26px] text-base font-bold"
              >
                {course}
              </li>
            ))}
          </ul>
          <p className="mt-[53px] text-[13px] text-ink-muted">Cursos de graduação da Faculdade Adventista do Paraná.</p>
        </div>
      </section>
    </>
  );
}
