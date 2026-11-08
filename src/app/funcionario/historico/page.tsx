import { Search } from "lucide-react";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { EmptyState, PageHeader, Pagination, TextField, TextLink } from "@/components";
import { FilterChips } from "@/components/FilterChips";
import { LinkTabs } from "@/components/LinkTabs";
import { LoanHistoryTable } from "@/components/LoanHistoryTable";
import { RolePage } from "@/components/RolePage";
import {
  formatIsoDate,
  HISTORY_PATH,
  historyHref,
  historySummary,
  parseHistoryFilters,
  periodError,
  STATUS_FILTERS,
} from "@/domain/history/history-rules";
import { getHistorySubject, listLoanHistory, searchHistoryCandidates } from "@/services/loan-history.service";
import type { HistoryFilters } from "@/types/loan-history";
import { HistoryCandidates } from "./HistoryCandidates";
import { HistorySubjectCard } from "./HistorySubjectCard";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const SEARCH_LABEL = {
  usuario: { label: "Buscar pessoa", placeholder: "Nome ou matrícula" },
  livro: { label: "Buscar livro", placeholder: "Título ou tombo" },
} as const;

// Resultado de uma pessoa ou de um livro: cartão, filtros (período e situação), tabela e paginação.
async function HistoryResult({ filters, subjectId }: { filters: HistoryFilters; subjectId: string }) {
  const subject = await getHistorySubject(filters.tab, subjectId);
  if (!subject) {
    return (
      <EmptyState
        title={filters.tab === "livro" ? "Livro não encontrado" : "Pessoa não encontrada"}
        description="O cadastro pode ter sido removido. Faça uma nova busca."
        action={<TextLink href={historyHref(filters, { subjectId: null, page: 1 })}>Nova busca</TextLink>}
      />
    );
  }

  const error = periodError(filters);
  const history = await listLoanHistory(filters);
  const pages = Math.max(1, Math.ceil(history.total / history.pageSize));
  const filtered = filters.status !== "all" || Boolean(filters.from || filters.to);
  const period = [filters.from && `de ${formatIsoDate(filters.from)}`, filters.to && `até ${formatIsoDate(filters.to)}`]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <HistorySubjectCard
        subject={subject}
        total={history.counts.all}
        changeHref={historyHref(filters, { subjectId: null, query: "", status: "all", page: 1 })}
      />

      <div className="mb-4 flex flex-col gap-4">
        <DateRangeFilter
          action={HISTORY_PATH}
          hidden={{
            ...(filters.tab === "livro" ? { aba: "livro", l: subjectId } : { u: subjectId }),
            ...(filters.status !== "all" ? { status: filters.status } : {}),
          }}
          from={filters.from}
          to={filters.to}
          error={error}
          clearHref={historyHref(filters, { from: null, to: null, page: 1 })}
        />
        <FilterChips
          label="Filtrar por situação"
          tone="solid"
          chips={STATUS_FILTERS.map((item) => ({
            label: item.label,
            count: history.counts[item.value],
            href: historyHref(filters, { status: item.value, page: 1 }),
            active: filters.status === item.value,
          }))}
        />
      </div>

      {history.rows.length === 0 ? (
        <EmptyState
          title={filtered ? "Nenhum empréstimo encontrado" : "Sem empréstimos registrados"}
          description={
            filtered
              ? `Não há empréstimos ${period ? `${period} ` : ""}com esse filtro. Tente outro período ou situação.`
              : filters.tab === "livro"
                ? "Este livro ainda não foi emprestado."
                : "Esta pessoa ainda não pegou nenhum livro."
          }
          action={
            filtered ? (
              <TextLink href={historyHref(filters, { from: null, to: null, status: "all", page: 1 })}>Limpar filtros</TextLink>
            ) : undefined
          }
        />
      ) : (
        <>
          <LoanHistoryTable rows={history.rows} focus={filters.tab} />
          <Pagination
            page={history.page}
            pages={pages}
            summary={historySummary(history.page, history.pageSize, history.rows.length, history.total)}
            label="Páginas do histórico"
            hrefFor={(target) => historyHref(filters, { page: target })}
          />
        </>
      )}
    </>
  );
}

// Busca da pessoa ou do livro: lista as opções para escolher uma.
async function HistorySearch({ filters }: { filters: HistoryFilters }) {
  if (!filters.query) {
    return (
      <EmptyState
        title={filters.tab === "livro" ? "Escolha um livro" : "Escolha uma pessoa"}
        description={
          filters.tab === "livro"
            ? "Busque pelo título ou pelo tombo para ver por quem o livro já passou."
            : "Busque pelo nome ou pela matrícula para ver o que a pessoa já pegou."
        }
      />
    );
  }
  const candidates = await searchHistoryCandidates(filters.tab, filters.query);
  if (candidates.length === 0) {
    return (
      <EmptyState
        title="Nada encontrado"
        description="Confira o nome, a matrícula, o título ou o tombo e tente de novo."
        action={<TextLink href={historyHref(filters, { query: "" })}>Limpar busca</TextLink>}
      />
    );
  }
  return <HistoryCandidates candidates={candidates} hrefFor={(id) => historyHref(filters, { subjectId: id, page: 1 })} />;
}

async function HistoricoContent({ searchParams }: { searchParams: SearchParams }) {
  const filters = parseHistoryFilters(await searchParams);
  const text = SEARCH_LABEL[filters.tab];
  const switchTab = (tab: HistoryFilters["tab"]) =>
    historyHref(filters, { tab, query: "", subjectId: null, status: "all", page: 1 });

  return (
    <>
      <PageHeader
        title="Histórico de empréstimos"
        breadcrumbs={[{ label: "Circulação" }, { label: "Histórico de empréstimos" }]}
        description="Consulte o que cada pessoa já pegou e por quem cada livro já passou."
      />

      <div className="mb-4">
        <LinkTabs
          label="Tipo de consulta"
          tabs={[
            { label: "Por usuário", href: switchTab("usuario"), active: filters.tab === "usuario" },
            { label: "Por livro", href: switchTab("livro"), active: filters.tab === "livro" },
          ]}
        />
      </div>

      {/* Buscar mantém a aba e o período; começar uma busca nova solta a pessoa ou o livro escolhido. */}
      <form method="get" action={HISTORY_PATH} className="mb-6 flex flex-wrap items-end gap-3">
        {filters.tab === "livro" && <input type="hidden" name="aba" value="livro" />}
        {filters.from && <input type="hidden" name="de" value={filters.from} />}
        {filters.to && <input type="hidden" name="ate" value={filters.to} />}
        <TextField
          id="historico-busca"
          name="q"
          label={text.label}
          hideLabel
          type="search"
          defaultValue={filters.query}
          placeholder={text.placeholder}
          maxLength={60}
          leadingIcon={Search}
          className="min-w-60 flex-1"
        />
        <button type="submit" className="h-10 cursor-pointer rounded-md bg-brand px-5 text-sm font-medium text-on-brand hover:bg-brand-hover">
          Buscar
        </button>
      </form>

      {filters.subjectId ? <HistoryResult filters={filters} subjectId={filters.subjectId} /> : <HistorySearch filters={filters} />}
    </>
  );
}

// Só a bibliotecária abre: o RolePage confere no servidor, além do proxy.ts (e o RLS do banco é a terceira barreira).
export default function HistoricoPage({ searchParams }: { searchParams: SearchParams }) {
  return <RolePage role="librarian">{() => <HistoricoContent searchParams={searchParams} />}</RolePage>;
}
