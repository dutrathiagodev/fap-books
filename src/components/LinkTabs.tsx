import Link from "next/link";

export interface LinkTab {
  label: string;
  href: string;
  active: boolean;
  count?: number;
}

export interface LinkTabsProps {
  // Nome do grupo para o leitor de tela, ex.: "Tipo de consulta".
  label: string;
  tabs: LinkTab[];
}

// Abas em forma de link (cada aba é um endereço): servem para telas que trocam de visão pelo servidor.
export function LinkTabs({ label, tabs }: LinkTabsProps) {
  return (
    <nav aria-label={label} className="inline-flex flex-wrap gap-1 rounded-lg border border-line bg-subtle p-1">
      {tabs.map((tab) => (
        <Link
          key={tab.label}
          href={tab.href}
          aria-current={tab.active ? "page" : undefined}
          className={`inline-flex min-h-11 items-center rounded-md px-4 py-2 text-sm md:min-h-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
            tab.active ? "bg-surface font-medium text-brand shadow-sm" : "text-ink-muted hover:text-ink"
          }`}
        >
          {tab.label}
          {tab.count !== undefined && <span> {tab.count}</span>}
        </Link>
      ))}
    </nav>
  );
}
