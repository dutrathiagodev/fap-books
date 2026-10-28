import Link from "next/link";
import { LOGIN_PATH } from "@/domain/access/access-rules";
import { BUTTON_PRIMARY, BUTTON_SOFT, CONTAINER } from "./styles";

// Seção "Peça o seu acesso" (Figma, card 0195: 600 px, título Lora Bold 54/66, círculo azul à esquerda).
// A foto da pessoa do Figma não entra: não há imagem autorizada no projeto.
// "Quero acesso" leva ao contato da biblioteca até existir a tela de pedido de acesso (card 0204).
export function LandingAccess() {
  return (
    <section id="acesso" className="relative overflow-hidden bg-page">
      <span aria-hidden className="absolute -top-1 left-[26px] hidden size-[608px] rounded-full bg-link lg:block" />
      <div className={`${CONTAINER} relative`}>
        <div className="py-16 lg:min-h-[600px] lg:pl-[520px] lg:pt-[186px] lg:pb-0">
          <h2 className="font-heading text-[32px] font-bold leading-10 md:text-[54px] md:leading-[66px]">
            <span className="block">Peça o seu acesso</span>
            <span className="block">ao FAP Books</span>
            <span className="block text-link">em poucos minutos</span>
          </h2>
          <p className="mt-6 max-w-[560px] text-[17px] leading-[27px] text-ink-muted lg:mt-[16px]">
            O cadastro é confirmado pela equipe da Biblioteca Professor Renato Gross. Depois é só entrar e começar a
            usar.
          </p>
          <div className="mt-8 flex flex-wrap gap-4 lg:mt-[48px]">
            <a href="#contato" className={`${BUTTON_SOFT} px-[34px]`}>
              Quero acesso
            </a>
            <Link href={LOGIN_PATH} className={`${BUTTON_PRIMARY} px-[52px]`}>
              Entrar
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
