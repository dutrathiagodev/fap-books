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
  // "soft" (padrão): chip em pílula com fundo claro no ativo. "solid" (histórico, card 0149): pílula com o ativo navy sólido.
  // "segmented" (multas, card 0144): botões dentro de uma só caixa com borda, o ativo com fundo claro.
  tone?: "soft" | "solid" | "segmented";
}

const ACTIVE_TONE = {
  soft: "border-brand bg-selected font-medium text-brand-ink",
  solid: "border-brand bg-brand font-medium text-on-brand",
  segmented: "border-transparent bg-selected font-medium text-brand-ink",
} as const;

// Chips de filtro (Figma, card 0144: Todas, Em aberto, Pagas). Cada chip é um link: o filtro fica no endereço,
// funciona sem JavaScript e a página já chega filtrada do servidor.
export function FilterChips({ label, chips, tone = "soft" }: FilterChipsProps) {
  return (
    <nav
      aria-label={label}
      className={tone === "segmented" ? "flex gap-1 rounded-lg border border-line bg-surface p-1" : "flex flex-wrap gap-2"}
    >
      {chips.map((chip) => (
        <Link
          key={chip.label}
          href={chip.href}
          aria-current={chip.active ? "true" : undefined}
          className={`inline-flex items-center gap-1.5 border text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
            tone === "segmented" ? "h-11 rounded-md px-3 md:h-9" : "h-11 rounded-full px-4"
          } ${
            chip.active
              ? ACTIVE_TONE[tone]
              : tone === "segmented"
                ? "border-transparent text-ink hover:bg-subtle"
                : "border-line-strong bg-surface text-ink hover:bg-subtle"
          }`}
        >
          {chip.label}
          {chip.count !== undefined && <span className={chip.active ? "" : "text-ink-muted"}>({chip.count})</span>}
        </Link>
      ))}
    </nav>
  );
}
