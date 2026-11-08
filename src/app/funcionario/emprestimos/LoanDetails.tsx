// Lista "rótulo à esquerda, valor em negrito à direita" do resumo, do comprovante e do painel de renovação (Figma).
export function LoanDetails({ rows, className = "" }: { rows: readonly (readonly [label: string, value: string])[]; className?: string }) {
  return (
    <dl className={`flex flex-col gap-3.5 ${className}`.trim()}>
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-start justify-between gap-3">
          <dt className="shrink-0 text-sm text-ink-muted">{label}</dt>
          <dd className="min-w-0 text-right text-[13px] leading-[18px] font-semibold break-words text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
