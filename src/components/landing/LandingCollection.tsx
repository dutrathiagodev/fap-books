import { BookOpen } from "lucide-react";
import { COURSES } from "@/content/landing";
import { SectionIntro } from "./SectionIntro";

// Capas ilustrativas: ainda não há capas reais autorizadas no projeto (card 0223), então usamos cores da marca.
const COVERS = [
  "bg-amber-300 text-navy-950",
  "bg-pink-300 text-navy-950",
  "bg-stone-300 text-navy-950",
  "bg-white text-navy-950",
  "bg-stone-200 text-navy-950",
  "bg-pink-200 text-navy-950",
  "bg-amber-200 text-navy-950",
  "bg-stone-400 text-navy-950",
];

// Seção do acervo (Figma, card 0195): texto sobre o acervo em fundo navy e os cursos atendidos.
export function LandingCollection() {
  return (
    <>
      <section id="quem-somos" className="bg-navy-900 text-white">
        <div className="mx-auto grid w-full max-w-[1200px] items-center gap-12 px-4 py-16 md:grid-cols-2 md:px-8 md:py-24">
          <div aria-hidden className="relative mx-auto grid w-full max-w-md grid-cols-4 gap-3">
            {COVERS.map((color, i) => (
              <span
                key={i}
                className={`flex aspect-[2/3] items-center justify-center rounded-sm shadow-md ${color}`}
              >
                <BookOpen size={20} strokeWidth={1.5} />
              </span>
            ))}
            <span className="absolute left-1/2 top-1/2 flex size-36 -translate-x-1/2 -translate-y-1/2 rotate-45 flex-col items-center justify-center rounded-3xl bg-navy-400 text-navy-950 shadow-lg">
              <span className="-rotate-45 text-center">
                <span className="block font-heading text-h3">3 livros</span>
                <span className="block text-xs">por pessoa, ao mesmo tempo</span>
              </span>
            </span>
          </div>

          <div className="flex flex-col items-start gap-6">
            <h2 className="font-heading text-h2 md:text-h1">
              <span className="text-navy-300">Seu acervo</span> completo, diversificado e sempre atualizado!
            </h2>
            <p className="text-base text-navy-200">
              A Biblioteca Professor Renato Gross reúne livros para todas as áreas dos cursos da FAP. No FAP Books você
              consulta o acervo, vê a situação de cada exemplar e acompanha os seus empréstimos.
            </p>
            <a
              href="#acesso"
              className="inline-flex items-center rounded-md bg-navy-500 px-6 py-3 text-sm font-medium text-white hover:bg-navy-400 focus-visible:outline-2 focus-visible:outline-white"
            >
              Conheça o nosso acervo
            </a>
          </div>
        </div>
      </section>

      <section id="acervo" className="bg-page">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 py-14 md:px-8">
          <SectionIntro title="Explore o acervo por curso" />
          <ul className="flex flex-wrap justify-center gap-3">
            {COURSES.map((course) => (
              <li key={course} className="rounded-full border border-line-strong bg-surface px-5 py-2 text-sm font-medium">
                {course}
              </li>
            ))}
          </ul>
          <p className="text-center text-sm text-ink-muted">Cursos de graduação da Faculdade Adventista do Paraná.</p>
        </div>
      </section>
    </>
  );
}
