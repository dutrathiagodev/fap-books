import Link from "next/link";
import { ACERVO_PATH } from "@/domain/access/access-rules";

export type BookFormTab = "manual" | "import";

const TABS: { key: BookFormTab; label: string; href: string }[] = [
  { key: "manual", label: "Formulário manual", href: `${ACERVO_PATH}/novo` },
  { key: "import", label: "Importar planilha (.csv / .xlsx)", href: `${ACERVO_PATH}/novo?aba=importar` },
];

// Abas do cadastro de livro (Figma, card 0117): formulário manual e importação por planilha. São links, então a aba
// escolhida fica no endereço e o botão "Importar planilha" do acervo abre direto nela.
export function BookFormTabs({ active }: { active: BookFormTab }) {
  return (
    <nav aria-label="Forma de cadastro" className="mb-6 flex gap-6 border-b border-line">
      {TABS.map(({ key, label, href }) => (
        <Link
          key={key}
          href={href}
          aria-current={key === active ? "page" : undefined}
          className={`-mb-px border-b-2 pb-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${key === active ? "border-brand text-brand" : "border-transparent text-ink-muted hover:text-ink"}`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
