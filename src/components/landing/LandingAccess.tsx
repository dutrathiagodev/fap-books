import Image from "next/image";
import Link from "next/link";
import { LOGIN_PATH } from "@/domain/access/access-rules";
import { BUTTON_PRIMARY, BUTTON_SOFT, CONTAINER } from "./styles";

// Seção "Peça o seu acesso" (Figma, card 0195: 600 px, título Lora Bold 54/66, círculo azul à esquerda).
// Foto do aluno: recorte do Figma (fundo transparente); origem e autorização em material-de-apoio/fotos-unsplash/CREDITOS.md.
// "Quero acesso" leva ao contato da biblioteca até existir a tela de pedido de acesso (card 0204).
export function LandingAccess() {
  return (
    <section id="acesso" className="relative overflow-hidden bg-page">
      {/* Losango azul (quadrado de 440 px girado 45°, cantos de 90 px) e foto do aluno cortada por ele (Figma: centro em x=330, y=300).
          No celular o conjunto aparece reduzido (60%) acima do texto. */}
      <div aria-hidden className="relative mx-auto mt-10 h-[350px] w-[331px] lg:absolute lg:left-0 lg:top-0 lg:mx-0 lg:mt-0 lg:h-[600px] lg:w-[660px]">
        <div className="absolute -left-[33px] top-0 h-[600px] w-[660px] origin-top-left scale-[0.6] lg:left-0 lg:scale-100">
          <div className="absolute left-[110px] top-[80px] size-[440px] rotate-45 overflow-hidden rounded-[90px] bg-link">
            <div className="absolute inset-0 -rotate-45">
              <Image
                src="/fotos/landing-acesso-aluno.webp"
                alt=""
                width={633}
                height={488}
                className="absolute -left-[55px] top-[8px] h-[488px] w-[633px] max-w-none"
              />
            </div>
          </div>
        </div>
      </div>
      <div className={`${CONTAINER} relative`}>
        <div className="pb-16 pt-6 lg:min-h-[600px] lg:pl-[520px] lg:pt-[186px] lg:pb-0">
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
