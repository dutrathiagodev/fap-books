import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { ROLE_LABELS } from "@/domain/access/access-rules";
import { HISTORY_PAGE_SIZE, periodBounds, STATUS_FILTERS, toHistoryRowView, type HistoryRow } from "@/domain/history/history-rules";
import { escapeLike } from "@/domain/loans/loan-lookup-rules";
import type { UserRole } from "@/types/profile";
import { RANGE_NOT_SATISFIABLE } from "./postgres-codes";
import type {
  HistoryCandidate,
  HistoryCounts,
  HistoryFilters,
  HistoryPage,
  HistoryStatusFilter,
  HistorySubject,
} from "@/types/loan-history";

// A lista de opções da busca é curta de propósito: se não achou entre as primeiras, a pessoa afina o texto.
const CANDIDATE_LIMIT = 8;

type Client = Awaited<ReturnType<typeof createSupabaseServerClient>>;

const LOAN_COLUMNS =
  "id, borrowed_at, due_at, returned_at, renewals, profiles!loans_user_id_fkey(full_name, registration), books(title, code)";

// A leitura é protegida pelo RLS (só a bibliotecária lê empréstimos de todos); a página confere o perfil antes de chegar aqui.
// Monta a consulta de empréstimos de uma pessoa ou de um livro, com o período e o filtro de situação.
// Com range = uma página de linhas (mais recentes primeiro); sem range (null) só conta, sem trazer linhas. Os filtros de multa usam join interno com fines (só empréstimos que têm multa).
function loansQuery(supabase: Client, filters: HistoryFilters, status: HistoryStatusFilter, now: Date, range: { from: number; to: number } | null) {
  const needsFine = status === "fined" || status === "fine_open";
  const columns = `${LOAN_COLUMNS}, ${needsFine ? "fines!inner" : "fines"}(amount_cents, days_late, paid_at)`;
  let query = supabase.from("loans").select(columns, { count: "exact", head: range === null });

  query = filters.tab === "livro" ? query.eq("book_id", filters.subjectId as string) : query.eq("user_id", filters.subjectId as string);

  const { start, end } = periodBounds(filters);
  if (start) query = query.gte("borrowed_at", start);
  if (end) query = query.lt("borrowed_at", end);

  if (status === "open") query = query.is("returned_at", null);
  if (status === "returned") query = query.not("returned_at", "is", null);
  if (status === "overdue") query = query.is("returned_at", null).lt("due_at", now.toISOString());
  if (status === "fine_open") query = query.is("fines.paid_at", null);
  // Toda leitura de linhas tem limite explícito (regra do plano gratuito); a contagem não traz linhas.
  if (range) {
    query = query.range(range.from, range.to);
    query = query.order("borrowed_at", { ascending: false }).order("id", { ascending: false });
  }
  return query;
}

async function countsFor(supabase: Client, filters: HistoryFilters, now: Date): Promise<HistoryCounts> {
  const results = await Promise.all(STATUS_FILTERS.map((item) => loansQuery(supabase, filters, item.value, now, null)));
  if (results.some((result) => result.error)) throw new Error("Não foi possível contar os empréstimos.");
  return Object.fromEntries(STATUS_FILTERS.map((item, index) => [item.value, results[index].count ?? 0])) as HistoryCounts;
}

// Uma página do histórico (mais recentes primeiro) da pessoa ou do livro escolhido em filters.subjectId.
export async function listLoanHistory(filters: HistoryFilters): Promise<HistoryPage> {
  if (!filters.subjectId) throw new Error("Escolha uma pessoa ou um livro.");
  const supabase = await createSupabaseServerClient();
  const now = new Date();
  const from = (filters.page - 1) * HISTORY_PAGE_SIZE;

  const [list, counts] = await Promise.all([
    loansQuery(supabase, filters, filters.status, now, { from, to: from + HISTORY_PAGE_SIZE - 1 }),
    countsFor(supabase, filters, now),
  ]);
  // Página além do fim (ex.: endereço antigo): o banco responde 416 e a tela mostra a lista vazia, não um erro.
  const beyondEnd = list.error?.code === RANGE_NOT_SATISFIABLE;
  if (list.error && !beyondEnd) throw new Error("Não foi possível consultar o histórico.");

  const rows = ((list.data ?? []) as unknown as HistoryRow[]).map((row) => toHistoryRowView(row, now));
  return { rows, total: counts[filters.status], page: filters.page, pageSize: HISTORY_PAGE_SIZE, counts };
}

// Cartão de cima do resultado: quem é a pessoa ou qual é o livro. null = não existe.
export async function getHistorySubject(tab: HistoryFilters["tab"], id: string): Promise<HistorySubject | null> {
  const supabase = await createSupabaseServerClient();
  if (tab === "livro") {
    const { data, error } = await supabase.from("books").select("id, title, author, code").eq("id", id).maybeSingle();
    if (error) throw new Error("Não foi possível consultar o livro.");
    return data ? { kind: "livro", id: data.id, title: data.title, details: [data.author, `Tombo ${data.code}`].filter(Boolean) } : null;
  }
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, registration, course, job_title")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Não foi possível consultar a pessoa.");
  if (!data) return null;
  const detail = data.role === "librarian" ? data.job_title : data.course;
  return {
    kind: "usuario",
    id: data.id,
    title: data.full_name,
    details: [ROLE_LABELS[data.role as UserRole], data.registration ? `Matrícula ${data.registration}` : null, detail].filter(
      (item): item is string => Boolean(item),
    ),
  };
}

// Opções da busca: pessoas por nome (trecho) ou matrícula (começo); livros por título (trecho) ou tombo (começo).
// Cada coluna é consultada à parte com .ilike(): o texto vai como parâmetro, nunca dentro de um filtro .or montado à mão.
export async function searchHistoryCandidates(tab: HistoryFilters["tab"], term: string): Promise<HistoryCandidate[]> {
  const supabase = await createSupabaseServerClient();
  const pattern = escapeLike(term);

  if (tab === "livro") {
    const [byTitle, byCode] = await Promise.all([
      supabase.from("books").select("id, title, author, code").ilike("title", `%${pattern}%`).order("title").limit(CANDIDATE_LIMIT),
      supabase.from("books").select("id, title, author, code").ilike("code", `${pattern}%`).order("title").limit(CANDIDATE_LIMIT),
    ]);
    if (byTitle.error || byCode.error) throw new Error("Não foi possível buscar os livros.");
    return uniqueById([...(byCode.data ?? []), ...(byTitle.data ?? [])])
      .slice(0, CANDIDATE_LIMIT)
      .map((book) => ({ id: book.id, title: book.title, detail: [book.author, `Tombo ${book.code}`].filter(Boolean).join(" · ") }));
  }

  const [byName, byRegistration] = await Promise.all([
    supabase.from("profiles").select("id, full_name, registration, role").ilike("full_name", `%${pattern}%`).order("full_name").limit(CANDIDATE_LIMIT),
    supabase.from("profiles").select("id, full_name, registration, role").ilike("registration", `${pattern}%`).order("full_name").limit(CANDIDATE_LIMIT),
  ]);
  if (byName.error || byRegistration.error) throw new Error("Não foi possível buscar as pessoas.");
  return uniqueById([...(byRegistration.data ?? []), ...(byName.data ?? [])])
    .slice(0, CANDIDATE_LIMIT)
    .map((person) => ({
      id: person.id,
      title: person.full_name,
      detail: [ROLE_LABELS[person.role as UserRole], person.registration ? `Matrícula ${person.registration}` : null]
        .filter(Boolean)
        .join(" · "),
    }));
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}
