import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { fineErrorCode, fineErrorMessage, isFinalFineError } from "@/domain/fines/fine-errors";
import { toFineView, type FineRow } from "@/domain/fines/fine-views";
import { escapeLike } from "@/domain/loans/loan-lookup-rules";
import type { FineActionResult, FineCounts, FineFilters, FineList } from "@/types/fine";

const PAGE_SIZE = 10;
// Tetos das leituras (regra do plano gratuito: toda consulta tem limite explícito).
const USER_MATCH_LIMIT = 50;
const OPEN_SUM_LIMIT = 5000;

type Client = Awaited<ReturnType<typeof createSupabaseServerClient>>;

const EMPTY_COUNTS: FineCounts = { all: 0, open: 0, paid: 0, openCents: 0 };

// A busca é por nome ou matrícula: acha os ids dos usuários antes, e a consulta de multas leva só uuids.
// Cada coluna vai à parte com .ilike(): o texto digitado é parâmetro, nunca vai dentro de um filtro .or.
async function findUserIds(supabase: Client, term: string): Promise<string[]> {
  const pattern = escapeLike(term);
  const [byName, byRegistration] = await Promise.all([
    supabase.from("profiles").select("id").ilike("full_name", `%${pattern}%`).limit(USER_MATCH_LIMIT),
    supabase.from("profiles").select("id").ilike("registration", `${pattern}%`).limit(USER_MATCH_LIMIT),
  ]);
  if (byName.error || byRegistration.error) throw new Error("Não foi possível fazer a consulta.");
  return [...new Set([...byName.data, ...byRegistration.data].map((row) => row.id))];
}

// Lista de multas da tela: a página pedida, mais os números dos chips e o total em aberto (todos respeitam a busca).
export async function listFines(filters: FineFilters): Promise<FineList> {
  const supabase = await createSupabaseServerClient();
  const emptyPage: FineList = { fines: [], counts: EMPTY_COUNTS, total: 0, page: 1, pages: 1, pageSize: PAGE_SIZE };

  let userIds: string[] | null = null;
  if (filters.query) {
    userIds = await findUserIds(supabase, filters.query);
    if (userIds.length === 0) return emptyPage;
  }

  // Contagens (sem trazer linhas) e a soma dos valores em aberto, no mesmo recorte de usuários.
  const count = (status: "all" | "open" | "paid") => {
    let query = supabase.from("fines").select("id", { count: "exact", head: true });
    if (userIds) query = query.in("user_id", userIds);
    if (status === "open") query = query.is("paid_at", null);
    if (status === "paid") query = query.not("paid_at", "is", null);
    return query.limit(1);
  };
  let openSum = supabase.from("fines").select("amount_cents").is("paid_at", null);
  if (userIds) openSum = openSum.in("user_id", userIds);

  const [all, open, paid, sum] = await Promise.all([count("all"), count("open"), count("paid"), openSum.limit(OPEN_SUM_LIMIT)]);
  if (all.error || open.error || paid.error || sum.error) throw new Error("Não foi possível consultar as multas.");
  const counts: FineCounts = {
    all: all.count ?? 0,
    open: open.count ?? 0,
    paid: paid.count ?? 0,
    openCents: sum.data.reduce((total, row) => total + row.amount_cents, 0),
  };

  const total = counts[filters.filter];
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(filters.page, pages);
  if (total === 0) return { ...emptyPage, counts };

  // Em aberto primeiro, depois as pagas da mais recente para a mais antiga.
  let query = supabase
    .from("fines")
    .select(
      "id, days_late, amount_cents, paid_at, profiles!fines_user_id_fkey(full_name, registration), payer:profiles!fines_paid_by_fkey(full_name), loans(due_at, books(title, code))",
    )
    .order("paid_at", { ascending: false, nullsFirst: true })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (userIds) query = query.in("user_id", userIds);
  if (filters.filter === "open") query = query.is("paid_at", null);
  if (filters.filter === "paid") query = query.not("paid_at", "is", null);

  const { data, error } = await query;
  if (error) throw new Error("Não foi possível consultar as multas.");
  return { fines: (data as unknown as FineRow[]).map(toFineView), counts, total, page, pages, pageSize: PAGE_SIZE };
}

// Baixa manual: quem decide é a função pay_fine do banco (só bibliotecária; grava autor e data, audita e é idempotente).
// A chave de idempotência nasce na tela, uma por baixa: o clique duplo e a nova tentativa de rede valem uma vez só.
export async function payFine(fineId: string, idempotencyKey: string): Promise<FineActionResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("pay_fine", { p_fine_id: fineId, p_idempotency_key: idempotencyKey });
  if (error) {
    // Só um código vai para o log (nunca nome, matrícula ou texto do banco).
    console.error("Falha ao registrar a baixa da multa:", fineErrorCode(error) ?? error.code ?? "desconhecido");
    return { ok: false, message: fineErrorMessage(error), final: isFinalFineError(error) };
  }
  return { ok: true };
}
