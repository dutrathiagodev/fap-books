import { Info, Search } from "lucide-react";
import { EmptyState, PageHeader, Pagination, TextField, TextLink } from "@/components";
import { FilterChips } from "@/components/FilterChips";
import { RolePage } from "@/components/RolePage";
import { FILTER_LABELS, FINES_PATH, fineHref, fineSummary, parseFineFilters } from "@/domain/fines/fine-rules";
import { listFines } from "@/services/fines.service";
import type { FineFilter } from "@/types/fine";
import { FinesDesk } from "./FinesDesk";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Controle de multas | FAP Books" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const CHIP_ORDER: FineFilter[] = ["all", "open", "paid"];

// Texto do vazio: sem multa em aberto é a boa notícia (Figma, card 0144); com busca ou filtro, ajuda a achar.
function emptyTexts(filter: FineFilter, hasQuery: boolean): { title: string; description: string } {
  if (hasQuery) return { title: "Nenhuma multa encontrada", description: "Tente outro nome ou matrícula, ou troque o filtro." };
  if (filter === "paid") return { title: "Nenhuma multa paga", description: "Quando uma baixa for registrada, ela aparece aqui." };
  if (filter === "open") return { title: "Nenhuma multa em aberto", description: "Quando houver atrasos na devolução, as multas aparecem aqui." };
  return { title: "Nenhuma multa registrada", description: "As multas por atraso aparecem aqui assim que a devolução for registrada." };
}

// A lista lê os filtros do endereço (dado da requisição), por isso roda dentro do Suspense do RolePage.
async function MultasContent({ searchParams }: { searchParams: SearchParams }) {
  const filters = parseFineFilters(await searchParams);
  const list = await listFines(filters);
  const first = list.total === 0 ? 0 : (list.page - 1) * list.pageSize + 1;
  const empty = emptyTexts(filters.filter, Boolean(filters.query));

  return (
    <>
      <PageHeader
        title="Controle de multas"
        breadcrumbs={[{ label: "Gestão bibliotecária" }, { label: "Multas" }]}
        description="Gestão das multas por atraso na devolução. O pagamento é feito presencialmente no balcão."
      />

      <aside className="mb-6 flex items-start gap-3 rounded-lg border border-info-100 bg-info-100 p-4 text-sm text-ink dark:border-sky-400/40 dark:bg-sky-400/15">
        <Info size={18} aria-hidden className="mt-0.5 shrink-0 text-info-700 dark:text-sky-300" />
        <p>
          <strong className="font-medium">Regra de negócio.</strong> O pagamento é presencial e manual (sem pagamento online).
          A baixa da multa libera o usuário para novos empréstimos.
        </p>
      </aside>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <form method="get" action={FINES_PATH} className="flex min-w-60 flex-1 items-end gap-3">
          {/* Buscar (ou Enter no campo) mantém o filtro escolhido. */}
          {filters.filter !== "open" && <input type="hidden" name="status" value={filters.filter} />}
          <TextField
            id="multas-busca"
            name="q"
            label="Buscar"
            hideLabel
            type="search"
            defaultValue={filters.query}
            placeholder="Nome ou matrícula"
            leadingIcon={Search}
            className="min-w-0 flex-1"
          />
          <button type="submit" className="h-11 cursor-pointer rounded-md bg-brand px-5 text-sm font-medium text-on-brand hover:bg-brand-hover">
            Buscar
          </button>
        </form>
        <FilterChips
          label="Filtrar multas"
          chips={CHIP_ORDER.map((filter) => ({
            label: FILTER_LABELS[filter],
            count: list.counts[filter],
            href: fineHref({ ...filters, filter, page: 1 }),
            active: filters.filter === filter,
          }))}
        />
      </div>

      {list.fines.length === 0 ? (
        <EmptyState
          title={empty.title}
          description={empty.description}
          action={filters.query ? <TextLink href={fineHref({ filter: filters.filter })}>Limpar busca</TextLink> : undefined}
        />
      ) : (
        <>
          <FinesDesk fines={list.fines} />
          <Pagination
            page={list.page}
            pages={list.pages}
            summary={fineSummary(first, first + list.fines.length - 1, list.total, list.counts.openCents)}
            label="Páginas das multas"
            hrefFor={(target) => fineHref({ ...filters, page: target })}
          />
        </>
      )}
    </>
  );
}

// Só a bibliotecária abre: o RolePage confere no servidor, além do proxy.ts.
export default function MultasPage({ searchParams }: { searchParams: SearchParams }) {
  return <RolePage role="librarian">{() => <MultasContent searchParams={searchParams} />}</RolePage>;
}
