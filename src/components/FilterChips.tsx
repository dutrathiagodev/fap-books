import Link from "next/link";

export interface FilterChip {
  label: string;
  count?: number;
  href: string;
  active: boolean;
}

export interface FilterChipsProps {
  // Nome do grupo para o leitor de tela, ex.: "Filtrar multas".
  label: string;
  chips: FilterChip[];
  // "soft" (padrão, tela de multas): chip ativo com fundo claro. "solid" (histórico, card 0149): chip ativo navy sólido.
  tone?: "soft" | "solid";
}

const ACTIVE_TONE = {
  soft: "border-brand bg-selected font-medium text-brand",
  solid: "border-brand bg-brand font-medium text-on-brand",
} as const;

// Chips de filtro (Figma, card 0144: Todas, Em aberto, Pagas). Cada chip é um link: o filtro fica no endereço,
// funciona sem JavaScript e a página já chega filtrada do servidor.
export function FilterChips({ label, chips, tone = "soft" }: FilterChipsProps) {
  return (
    <nav aria-label={label} className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <Link
          key={chip.label}
          href={chip.href}
          aria-current={chip.active ? "true" : undefined}
          className={`inline-flex h-11 items-center gap-1.5 rounded-full border px-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
            chip.active ? ACTIVE_TONE[tone] : "border-line-strong bg-surface text-ink hover:bg-subtle"
          }`}
        >
          {chip.label}
          {chip.count !== undefined && <span className={chip.active ? "" : "text-ink-muted"}>({chip.count})</span>}
        </Link>
      ))}
    </nav>
  );
}
