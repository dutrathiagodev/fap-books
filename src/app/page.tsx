import type { Metadata } from "next";
import { LandingAccess } from "@/components/landing/LandingAccess";
import { LandingCollection } from "@/components/landing/LandingCollection";
import { LandingContact } from "@/components/landing/LandingContact";
import { LandingFaq } from "@/components/landing/LandingFaq";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingNews } from "@/components/landing/LandingNews";
import { LandingNumbers } from "@/components/landing/LandingNumbers";
import { LandingProfiles } from "@/components/landing/LandingProfiles";
import { LandingResources } from "@/components/landing/LandingResources";

export const metadata: Metadata = {
  title: "FAP Books | Biblioteca da Faculdade Adventista do Paraná",
  description:
    "Consulta ao acervo, empréstimos, reservas, prazos e avisos da Biblioteca Professor Renato Gross, em um só lugar.",
};

// Landing page (Figma, cards 0195 e 0198): página pública, só de leitura, sem formulário nem dado de usuário.
// Quem está logado nem chega aqui: o proxy.ts leva cada pessoa para a área dela.
// Falta o formulário da newsletter, que precisa de uma tabela no banco.
export default function Home() {
  return (
    <>
      <LandingHeader />
      <main className="flex-1">
        <LandingHero />
        <LandingProfiles />
        <LandingCollection />
        <LandingResources />
        <LandingAccess />
        <LandingNumbers />
        <LandingNews />
        <LandingFaq />
        <LandingContact />
      </main>
      <LandingFooter />
    </>
  );
}
