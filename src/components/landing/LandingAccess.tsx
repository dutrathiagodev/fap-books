import Link from "next/link";
import { LOGIN_PATH } from "@/domain/access/access-rules";

// Seção "Peça o seu acesso" (Figma, card 0195). A foto da pessoa do Figma não entra: não há imagem autorizada no projeto.
// "Quero acesso" leva ao contato da biblioteca até existir a tela de pedido de acesso (card 0204).
export function LandingAccess() {
  return (
    <section id="acesso" className="bg-page">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center gap-6 px-4 py-16 text-center md:px-8 md:py-24">
        <h2 className="font-heading text-h2 text-brand md:text-h1">
          Peça o seu acesso ao FAP Books <span className="text-link">em poucos minutos</span>
        </h2>
        <p className="max-w-xl text-base text-ink-muted">
          O cadastro é confirmado pela equipe da Biblioteca Professor Renato Gross. Depois é só entrar e começar a usar.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <a
            href="#contato"
            className="inline-flex items-center rounded-md bg-selected px-6 py-3 text-sm font-medium text-brand hover:bg-navy-100 focus-visible:outline-2 focus-visible:outline-focus"
          >
            Quero acesso
          </a>
          <Link
            href={LOGIN_PATH}
            className="inline-flex items-center rounded-md bg-brand px-6 py-3 text-sm font-medium text-on-brand hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-focus"
          >
            Entrar
          </Link>
        </div>
      </div>
    </section>
  );
}
