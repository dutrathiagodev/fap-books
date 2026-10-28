import { BookOpen, Bookmark, Library } from "lucide-react";

// Apresentação da landing (Figma, card 0195). A foto da pessoa do Figma não entra: não há imagem autorizada no projeto.
export function LandingHero() {
  return (
    <section id="inicio" className="bg-subtle">
      <div className="mx-auto grid w-full max-w-[1200px] items-center gap-12 px-4 py-16 md:grid-cols-[1.1fr_0.9fr] md:px-8 md:py-24">
        <div className="flex flex-col gap-6">
          <h1 className="font-heading text-4xl font-semibold leading-tight text-brand md:text-[3rem] md:leading-[3.5rem]">
            Biblioteca da FAP para alunos, professores e bibliotecários!
          </h1>
          <p className="max-w-xl text-base text-ink-muted">
            O FAP Books reúne a consulta ao acervo, empréstimos, reservas, prazos e avisos da Biblioteca Professor
            Renato Gross em um só lugar.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="#recursos"
              className="inline-flex items-center rounded-md bg-brand px-6 py-3 text-sm font-medium text-on-brand hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-focus"
            >
              Conheça o FAP Books
            </a>
            <a
              href="#acesso"
              className="inline-flex items-center rounded-md bg-selected px-6 py-3 text-sm font-medium text-brand hover:bg-navy-100 focus-visible:outline-2 focus-visible:outline-focus"
            >
              Quero acesso
            </a>
          </div>
        </div>

        <div aria-hidden className="relative mx-auto hidden h-72 w-full max-w-sm md:block">
          <span className="absolute left-4 top-0 flex size-28 rotate-45 items-center justify-center rounded-2xl bg-navy-700 text-white shadow-md">
            <Bookmark size={36} strokeWidth={1.5} className="-rotate-45" />
          </span>
          <span className="absolute right-4 top-20 flex size-28 rotate-45 items-center justify-center rounded-2xl bg-navy-300 text-white shadow-md">
            <BookOpen size={36} strokeWidth={1.5} className="-rotate-45" />
          </span>
          <span className="absolute bottom-0 left-16 flex size-28 rotate-45 items-center justify-center rounded-2xl bg-navy-900 text-white shadow-md">
            <Library size={36} strokeWidth={1.5} className="-rotate-45" />
          </span>
        </div>
      </div>
    </section>
  );
}
