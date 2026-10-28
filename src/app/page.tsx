import type { Metadata } from "next";
import { FirstVisitRedirect } from "@/components/WelcomeStorage";
import { LandingAccess } from "@/components/landing/LandingAccess";
import { LandingCollection } from "@/components/landing/LandingCollection";
import { LandingContact } from "@/components/landing/LandingContact";
import { LandingFaq } from "@/components/landing/LandingFaq";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingNews } from "@/components/landing/LandingNews";
import { LandingNewsletter } from "@/components/landing/LandingNewsletter";
import { LandingNumbers } from "@/components/landing/LandingNumbers";
import { LandingProfiles } from "@/components/landing/LandingProfiles";
import { LandingResources } from "@/components/landing/LandingResources";

export const metadata: Metadata = {
  title: "FAP Books | Biblioteca da Faculdade Adventista do Paraná",
  description:
    "Consulta ao acervo, empréstimos, reservas, prazos e avisos da Biblioteca Professor Renato Gross, em um só lugar.",
};

// Landing page (Figma, cards 0195 e 0198): página pública. O único formulário é o da newsletter,
// que valida no servidor e só grava nome e e-mail com consentimento (tabela newsletter_subscribers).
// Quem está logado nem chega aqui: o proxy.ts leva cada pessoa para a área dela.
// No celular, no primeiro acesso, a pessoa é levada às boas-vindas (FirstVisitRedirect).
export default function Home() {
  return (
    <>
      <FirstVisitRedirect />
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
        <LandingNewsletter />
      </main>
      <LandingFooter />
    </>
  );
}
