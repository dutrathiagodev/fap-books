import type { Metadata } from "next";
import Image from "next/image";
import { Button } from "@/components/Button";
import { Logo } from "@/components/Logo";
import { MobileOnly } from "@/components/MobileOnly";
import { LOGIN_PATH } from "@/domain/access/access-rules";

export const metadata: Metadata = { title: "Bem-vindo | FAP Books" };

// Tela de boas-vindas do celular (Figma, card 0221, quadro "Boas-vindas" 375×850).
// Medidas do Figma: foto de 640 px com 60% de opacidade, gradiente do azul para o navy e textos centralizados.
// No computador esta tela não aparece: vai direto ao login.
export default function BoasVindasPage() {
  return (
    <MobileOnly desktopHref={LOGIN_PATH}>
      <main className="relative flex min-h-dvh flex-col items-center overflow-hidden bg-navy-950 text-white">
        {/* Foto da FAP (campus) com o gradiente por cima, só nos 640 px de cima. */}
        <div aria-hidden className="absolute inset-x-0 top-0 h-[640px]">
          <Image
            src="/fotos/boas-vindas-campus.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgb(3_43_94/0.6)_0%,rgb(3_23_48/0.5)_45%,rgb(3_23_48)_100%)]" />
        </div>

        <div className="relative flex h-[640px] w-full flex-col items-center px-6 pt-[140px]">
          <Logo width={172} tone="white" />
          <p className="mt-[9px] text-center text-xs leading-4 text-navy-200">
            Biblioteca da Faculdade Adventista do Paraná
          </p>
          <h1 className="absolute inset-x-6 bottom-5 text-center font-heading text-[22px] font-semibold leading-[30px]">
            Consulte o acervo, renove e reserve em um só lugar.
          </h1>
        </div>

        <div className="relative flex w-full flex-col items-center gap-7 px-6 pt-11">
          <Button text="Entrar" href={LOGIN_PATH} variant="light" />
          <p className="text-center text-xs leading-4 text-navy-200">O cadastro é feito pela equipe da biblioteca.</p>
        </div>
      </main>
    </MobileOnly>
  );
}
