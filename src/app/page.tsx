import type { Metadata } from "next";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingHero } from "@/components/landing/LandingHero";

export const metadata: Metadata = {
  title: "FAP Books | Biblioteca da Faculdade Adventista do Paraná",
  description:
    "Consulta ao acervo, empréstimos, reservas, prazos e avisos da Biblioteca Professor Renato Gross, em um só lugar.",
};

// Landing page (Figma, cards 0195 e 0198), feita por seções. Quem está logado nem chega aqui:
// o proxy.ts leva cada pessoa para a área dela. Sem o proxy (sem .env.local) a landing abre para todos.
export default function Home() {
  return (
    <>
      <LandingHeader />
      <main className="flex-1">
        <LandingHero />
      </main>
      <LandingFooter />
    </>
  );
}
