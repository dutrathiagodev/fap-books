import type {
  LoanRecord,
  LoanRecordErrors,
  LoanRecordFilters,
  LoanRecordStatus,
  LoanRecordSummary,
  LoanRecordValues,
  LoanStatusFilter,
} from "@/types/loan-record";

// Regras puras do controle de empréstimo de livros: sem tela e sem banco, para testar com facilidade.
// "Hoje" entra sempre como parâmetro (aaaa-mm-dd): a tela e os testes decidem qual é.

export const LOAN_RECORD_CATEGORIES = [
  "Romance",
  "Ficção",
  "Teologia",
  "Ciência",
  "Técnico",
  "Didático",
  "Infantil",
  "Outros",
] as const;

export const LOAN_STATUS_OPTIONS: { value: LoanStatusFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "borrowed", label: "Emprestados" },
  { value: "returned", label: "Devolvidos" },
];

export const EMPTY_LOAN_VALUES: LoanRecordValues = { bookTitle: "", author: "", readerName: "", category: "", loanedOn: "", dueOn: "" };
export const DEFAULT_LOAN_FILTERS: LoanRecordFilters = { status: "all", category: "", query: "" };

const LIMITS = { bookTitle: 200, author: 120, readerName: 120 } as const;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

// Data de hoje no calendário local, em aaaa-mm-dd.
export function todayIso(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function isValidIsoDate(value: string): boolean {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function dayNumber(isoDate: string): number {
  const [year, month, day] = isoDate.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

// "2026-11-25" -> "25/11/2026".
export function formatLoanDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

// Atrasado = ainda não devolvido e o prazo (data prevista) já passou. Devolvido nunca é atrasado.
export function statusOf(record: Pick<LoanRecord, "returnedOn" | "dueOn">, today: string): LoanRecordStatus {
  if (record.returnedOn) return "returned";
  return record.dueOn < today ? "overdue" : "borrowed";
}

export const STATUS_LABELS: Record<LoanRecordStatus, string> = { borrowed: "Emprestado", returned: "Devolvido", overdue: "Atrasado" };

// Dias de atraso de um livro ainda não devolvido (0 se está no prazo ou já voltou).
export function daysLate(record: Pick<LoanRecord, "returnedOn" | "dueOn">, today: string): number {
  if (statusOf(record, today) !== "overdue") return 0;
  return dayNumber(today) - dayNumber(record.dueOn);
}

export function lateText(days: number): string {
  return days === 1 ? "1 dia de atraso" : `${days} dias de atraso`;
}

// Contadores do resumo: sempre calculados da lista (nada digitado à mão). "Emprestados" são os em aberto, atrasados inclusive.
export function summarize(records: LoanRecord[], today: string): LoanRecordSummary {
  const returned = records.filter((record) => record.returnedOn).length;
  const overdue = records.filter((record) => statusOf(record, today) === "overdue").length;
  return { total: records.length, open: records.length - returned, returned, overdue };
}

function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

// Filtros por status e categoria e busca em tempo real por título ou leitor (sem acento, sem diferenciar maiúsculas).
export function filterRecords(records: LoanRecord[], filters: LoanRecordFilters): LoanRecord[] {
  const query = normalize(filters.query);
  return records
    .filter((record) => (filters.status === "all" ? true : filters.status === "returned" ? Boolean(record.returnedOn) : !record.returnedOn))
    .filter((record) => (filters.category ? record.category === filters.category : true))
    .filter((record) => (query ? normalize(record.bookTitle).includes(query) || normalize(record.readerName).includes(query) : true));
}

// Categorias que existem na lista, em ordem alfabética (alimentam o filtro).
export function categoriesOf(records: LoanRecord[]): string[] {
  return [...new Set(records.map((record) => record.category))].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export function cleanValues(values: LoanRecordValues): LoanRecordValues {
  return {
    bookTitle: values.bookTitle.trim(),
    author: values.author.trim(),
    readerName: values.readerName.trim(),
    category: values.category.trim(),
    loanedOn: values.loanedOn.trim(),
    dueOn: values.dueOn.trim(),
  };
}

// Valida o formulário: todos os campos são obrigatórios e a data prevista não pode ser antes da data do empréstimo.
export function validateLoanValues(raw: LoanRecordValues): LoanRecordErrors {
  const values = cleanValues(raw);
  const errors: LoanRecordErrors = {};
  if (!values.bookTitle) errors.bookTitle = "Informe o título do livro.";
  else if (values.bookTitle.length > LIMITS.bookTitle) errors.bookTitle = `Use até ${LIMITS.bookTitle} caracteres.`;
  if (!values.author) errors.author = "Informe o autor.";
  else if (values.author.length > LIMITS.author) errors.author = `Use até ${LIMITS.author} caracteres.`;
  if (!values.readerName) errors.readerName = "Informe o nome do leitor.";
  else if (values.readerName.length > LIMITS.readerName) errors.readerName = `Use até ${LIMITS.readerName} caracteres.`;
  if (!values.category) errors.category = "Escolha a categoria.";
  else if (!(LOAN_RECORD_CATEGORIES as readonly string[]).includes(values.category)) errors.category = "Escolha uma categoria da lista.";
  if (!values.loanedOn) errors.loanedOn = "Informe a data do empréstimo.";
  else if (!isValidIsoDate(values.loanedOn)) errors.loanedOn = "Data inválida.";
  if (!values.dueOn) errors.dueOn = "Informe a data prevista de devolução.";
  else if (!isValidIsoDate(values.dueOn)) errors.dueOn = "Data inválida.";
  else if (!errors.loanedOn && values.dueOn < values.loanedOn) errors.dueOn = "A devolução não pode ser antes do empréstimo.";
  return errors;
}

export function hasErrors(errors: LoanRecordErrors): boolean {
  return Object.keys(errors).length > 0;
}
