// Controle de empréstimo de livros (atividade da disciplina): o caderno pessoal de cada pessoa logada.
// Datas em aaaa-mm-dd (como o banco devolve a coluna date).
export interface LoanRecord {
  id: string;
  bookTitle: string;
  author: string;
  readerName: string;
  category: string;
  loanedOn: string;
  dueOn: string;
  returnedOn: string | null;
}

// O que a pessoa digita no formulário (texto cru; quem valida é loan-record-rules).
export interface LoanRecordValues {
  bookTitle: string;
  author: string;
  readerName: string;
  category: string;
  loanedOn: string;
  dueOn: string;
}

export type LoanRecordStatus = "borrowed" | "returned" | "overdue";
export type LoanStatusFilter = "all" | "borrowed" | "returned";

export interface LoanRecordFilters {
  status: LoanStatusFilter;
  // "" = todas as categorias.
  category: string;
  // Busca em tempo real por título do livro ou nome do leitor.
  query: string;
}

export interface LoanRecordSummary {
  total: number;
  open: number;
  returned: number;
  overdue: number;
}

export type LoanRecordField = keyof LoanRecordValues;
export type LoanRecordErrors = Partial<Record<LoanRecordField, string>>;

