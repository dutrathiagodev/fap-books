import Link from "next/link";

export type LoanTab = "emprestimo" | "devolucao" | "renovacao";

export const LOAN_TABS: { key: LoanTab; label: string }[] = [
  { key: "emprestimo", label: "Empréstimo" },
  { key: "devolucao", label: "Devolução" },
  { key: "renovacao", label: "Renovação" },
];

// Aba lida do endereço (?aba=). Qualquer outro valor cai em Empréstimo.
export function parseLoanTab(value: string | string[] | undefined): LoanTab {
  return LOAN_TABS.find((tab) => tab.key === value)?.key ?? "emprestimo";
}

// Abas da tela (Figma 6574-1330): links comuns, então funcionam sem JavaScript e a aba fica no endereço.
export function LoanTabs({ active, basePath }: { active: LoanTab; basePath: string }) {
  return (
    <nav aria-label="Seções do balcão" className="mb-6 flex gap-6 border-b border-line">
      {LOAN_TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.key === "emprestimo" ? basePath : `${basePath}?aba=${tab.key}`}
          aria-current={tab.key === active ? "page" : undefined}
          className={`-mb-px inline-flex min-h-11 items-end border-b-2 pb-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
            tab.key === active ? "border-brand text-brand" : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
