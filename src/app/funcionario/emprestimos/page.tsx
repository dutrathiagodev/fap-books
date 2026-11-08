import { Search } from "lucide-react";
import { EmptyState, PageHeader, TextField, TextLink } from "@/components";
import { RolePage } from "@/components/RolePage";
import { parseLookupTerm } from "@/domain/loans/loan-lookup-rules";
import { listOpenLoans } from "@/services/loans.service";
import { LoanDesk } from "./LoanDesk";
import { LoanTabs, parseLoanTab } from "./LoanTabs";
import { RenewDesk } from "./RenewDesk";
import { ReturnList } from "./ReturnList";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Registro de empréstimo | FAP Books" };

const EMPRESTIMOS_PATH = "/funcionario/emprestimos";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// As abas Devolução e Renovação listam os empréstimos em aberto e leem a busca do endereço (?q=).
async function OpenLoans({ tab, rawTerm }: { tab: "devolucao" | "renovacao"; rawTerm: string }) {
  const parsed = parseLookupTerm(rawTerm);
  const term = parsed.ok ? parsed.term : "";
  const loans = await listOpenLoans(term);
  const placeholder = tab === "devolucao" ? "Buscar por livro ou usuário" : "Buscar empréstimo por livro ou usuário";

  return (
    <>
      <form method="get" action={EMPRESTIMOS_PATH} className="mb-4 flex flex-wrap items-end gap-3">
        <input type="hidden" name="aba" value={tab} />
        <TextField
          id="emprestimos-busca"
          name="q"
          label="Buscar"
          hideLabel
          type="search"
          defaultValue={term}
          placeholder={placeholder}
          leadingIcon={Search}
          className="min-w-60 flex-1"
        />
        <button type="submit" className="h-11 cursor-pointer rounded-md bg-brand px-5 text-sm font-medium text-on-brand hover:bg-brand-hover">
          Buscar
        </button>
      </form>
      {loans.length === 0 ? (
        <EmptyState
          title={term ? "Nenhum empréstimo encontrado" : "Nenhum empréstimo em aberto"}
          description={term ? "Tente outro nome, matrícula, título ou tombo." : "Quando houver livros emprestados, eles aparecem aqui."}
          action={term ? <TextLink href={`${EMPRESTIMOS_PATH}?aba=${tab}`}>Limpar busca</TextLink> : undefined}
        />
      ) : tab === "devolucao" ? (
        <ReturnList loans={loans} />
      ) : (
        <RenewDesk loans={loans} />
      )}
    </>
  );
}

async function EmprestimosContent({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const tab = parseLoanTab(params.aba);
  const rawTerm = typeof params.q === "string" ? params.q : "";

  return (
    <>
      <PageHeader
        title="Registro de empréstimo"
        breadcrumbs={[{ label: "Circulação" }, { label: "Empréstimos" }]}
        description="Registre empréstimos, devoluções e renovações no balcão."
      />
      <LoanTabs active={tab} basePath={EMPRESTIMOS_PATH} />
      {tab === "emprestimo" ? <LoanDesk /> : <OpenLoans tab={tab} rawTerm={rawTerm} />}
    </>
  );
}

// Só a bibliotecária abre: o RolePage confere no servidor, além do proxy.ts.
export default function EmprestimosPage({ searchParams }: { searchParams: SearchParams }) {
  return <RolePage role="librarian">{() => <EmprestimosContent searchParams={searchParams} />}</RolePage>;
}
