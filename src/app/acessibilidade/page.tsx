import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/InfoPage";
import { CONTACTS } from "@/content/landing";
import { SUPPORT_PATH } from "@/domain/access/access-rules";

export const metadata: Metadata = { title: "Acessibilidade | FAP Books" };

const EMAIL = CONTACTS.find(({ label }) => label === "E-mail");

// Declaração de acessibilidade (Figma, rodapé do card 0195). Sem selo nem auditoria formal: só o que o sistema faz hoje.
export default function AcessibilidadePage() {
  return (
    <InfoPage
      title="Acessibilidade"
      intro="O FAP Books deve ser fácil de usar por todas as pessoas, no computador e no celular."
    >
      <section className="flex flex-col gap-2">
        <h2>O que fazemos</h2>
        <ul>
          <li>Todas as telas funcionam só com o teclado, com o foco sempre visível.</li>
          <li>Textos e botões com contraste alto, em modo claro e em modo escuro (segue o seu aparelho).</li>
          <li>Títulos, botões e campos com nomes claros para leitores de tela.</li>
          <li>Imagens que só enfeitam não são lidas pelos leitores de tela.</li>
          <li>As telas se ajustam ao tamanho do aparelho, sem precisar rolar para o lado.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2>O que ainda não fizemos</h2>
        <p>
          Seguimos as diretrizes WCAG 2.2, nível AA, como meta, mas ainda não houve uma auditoria formal. Se algo não
          funcionar para você, queremos saber.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2>Encontrou uma barreira?</h2>
        <p>
          Conte para a biblioteca{EMAIL ? <> pelo e-mail <a href={EMAIL.href}>{EMAIL.value}</a></> : null} ou pela página
          de <Link href={SUPPORT_PATH}>suporte</Link>. Diga qual tela e o que atrapalhou; vamos corrigir.
        </p>
      </section>
    </InfoPage>
  );
}
