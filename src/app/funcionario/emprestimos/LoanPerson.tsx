// Pessoa da linha da tabela: iniciais, nome e matrícula (Figma 6574-1777).
export function LoanPerson({ name, initials, registration }: { name: string; initials: string; registration: string }) {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-selected text-xs font-medium text-brand-ink">
        {initials}
      </span>
      <div className="min-w-0">
        <p className="font-medium text-ink">{name}</p>
        <p className="text-xs text-ink-muted">{registration}</p>
      </div>
    </div>
  );
}
