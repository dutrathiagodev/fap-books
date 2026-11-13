import { CalendarDays } from "lucide-react";
import Link from "next/link";
import { FieldError } from "./FieldError";

export interface DateRangeFilterProps {
  // Para onde o formulário envia (GET), ex.: "/funcionario/historico".
  action: string;
  // Valores que precisam ir junto (aba, busca, pessoa escolhida, situação): o filtro de período não pode perdê-los.
  hidden: Record<string, string>;
  // Datas no formato aaaa-mm-dd (o valor do campo de data).
  from: string | null;
  to: string | null;
  error?: string | null;
  // Endereço sem o período (o botão Limpar).
  clearHref: string;
}

const DATE_INPUT =
  "h-10 rounded-md border border-line bg-surface px-3 text-sm text-ink focus:border-focus focus:outline-2 focus:outline-focus";

// Filtro por período (Figma, card 0152): data inicial e final. É um formulário comum (GET), sem JavaScript.
// O campo de data do navegador mostra dd/mm/aaaa no idioma do sistema; o endereço guarda aaaa-mm-dd.
export function DateRangeFilter({ action, hidden, from, to, error, clearHref }: DateRangeFilterProps) {
  return (
    <form method="get" action={action} className="flex flex-col gap-2">
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium">
          <span className="flex items-center gap-1.5">
            <CalendarDays size={16} strokeWidth={1.5} aria-hidden className="text-ink-muted" />
            Retirada de
          </span>
          <input type="date" name="de" defaultValue={from ?? ""} aria-invalid={error ? true : undefined} className={DATE_INPUT} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Até
          <input type="date" name="ate" defaultValue={to ?? ""} aria-invalid={error ? true : undefined} className={DATE_INPUT} />
        </label>
        <button type="submit" className="h-11 cursor-pointer rounded-md md:h-10 bg-brand px-4 text-sm font-medium text-on-brand hover:bg-brand-hover">
          Aplicar período
        </button>
        {(from || to) && (
          <Link href={clearHref} className="flex h-11 items-center rounded-md md:h-10 border border-line-strong px-4 text-sm hover:bg-subtle">
            Limpar
          </Link>
        )}
      </div>
      {error && <FieldError message={error} />}
    </form>
  );
}
