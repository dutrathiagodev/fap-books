import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { escapeLike } from "@/domain/loans/loan-lookup-rules";
import {
  isFinalUserAdminError,
  userAdminErrorCode,
  userAdminErrorMessage,
} from "@/domain/users/user-admin-errors";
import { toUpdateArgs, type UserEditValues } from "@/domain/users/user-edit-rules";
import { toUserView, type UserRow } from "@/domain/users/user-views";
import type { UserAdminResult, UserCounts, UserFilters, UserList } from "@/types/user-admin";
import type { UserRole } from "@/types/profile";

const PAGE_SIZE = 10;
// Tetos das leituras (regra do plano gratuito: toda consulta tem limite explícito).
const ID_MATCH_LIMIT = 100;
const COUNT_LIMIT = 5000;
const OPEN_LOANS_LIMIT = 1000;

type Client = Awaited<ReturnType<typeof createSupabaseServerClient>>;

const EMPTY_COUNTS: UserCounts = {
  byRole: { all: 0, student: 0, teacher: 0, librarian: 0 },
  byStatus: { all: 0, active: 0, inactive: 0 },
};

const COLUMNS = "id, full_name, email, role, active, phone, registration, course, job_title, graduating";

// A busca é por nome, e-mail ou matrícula: acha os ids antes e a consulta da lista leva só uuids. Cada coluna vai à parte
// com .ilike(): o texto digitado é parâmetro, nunca vai dentro de um filtro .or (não dá para injetar filtro).
// Com mais de 100 achados por coluna a busca pede para refinar (limite do plano gratuito).
async function findUserIds(supabase: Client, term: string): Promise<string[]> {
  const pattern = escapeLike(term);
  const [byName, byEmail, byRegistration] = await Promise.all([
    supabase.from("profiles").select("id").ilike("full_name", `%${pattern}%`).limit(ID_MATCH_LIMIT),
    supabase.from("profiles").select("id").ilike("email", `%${pattern}%`).limit(ID_MATCH_LIMIT),
    supabase.from("profiles").select("id").ilike("registration", `${pattern}%`).limit(ID_MATCH_LIMIT),
  ]);
  if (byName.error || byEmail.error || byRegistration.error) throw new Error("Não foi possível fazer a consulta.");
  return [...new Set([...byName.data, ...byEmail.data, ...byRegistration.data].map((row) => row.id))];
}

// Chips com a contagem: perfil conta dentro da situação escolhida e situação dentro do perfil, os dois dentro da busca.
function countUsers(rows: { role: UserRole; active: boolean }[], filters: UserFilters): UserCounts {
  const counts: UserCounts = structuredClone(EMPTY_COUNTS);
  for (const row of rows) {
    const status = row.active ? "active" : "inactive";
    if (filters.status === "all" || filters.status === status) {
      counts.byRole.all += 1;
      counts.byRole[row.role] += 1;
    }
    if (filters.role === "all" || filters.role === row.role) {
      counts.byStatus.all += 1;
      counts.byStatus[status] += 1;
    }
  }
  return counts;
}

// Lista da tela: a página pedida, com os empréstimos em aberto de cada pessoa e os números dos chips.
// Só a funcionária lê todos os perfis (RLS profiles_select_own_or_librarian); quem chama já conferiu o papel.
export async function listUsers(filters: UserFilters, selfId: string): Promise<UserList> {
  const supabase = await createSupabaseServerClient();
  const emptyPage: UserList = { users: [], counts: EMPTY_COUNTS, total: 0, page: 1, pages: 1, pageSize: PAGE_SIZE };

  let ids: string[] | null = null;
  if (filters.query) {
    ids = await findUserIds(supabase, filters.query);
    if (ids.length === 0) return emptyPage;
  }

  let countQuery = supabase.from("profiles").select("role, active");
  if (ids) countQuery = countQuery.in("id", ids);
  const countsResult = await countQuery.limit(COUNT_LIMIT);
  if (countsResult.error) throw new Error("Não foi possível consultar os usuários.");
  const counts = countUsers(countsResult.data as { role: UserRole; active: boolean }[], filters);

  const total = counts.byRole[filters.role];
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(filters.page, pages);
  if (total === 0) return { ...emptyPage, counts };

  let query = supabase
    .from("profiles")
    .select(COLUMNS)
    .order("full_name", { ascending: true })
    .order("id", { ascending: true })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (ids) query = query.in("id", ids);
  if (filters.role !== "all") query = query.eq("role", filters.role);
  if (filters.status !== "all") query = query.eq("active", filters.status === "active");

  const { data, error } = await query;
  if (error) throw new Error("Não foi possível consultar os usuários.");
  const rows = data as UserRow[];

  // Empréstimos em aberto só das pessoas desta página.
  const loans = await supabase
    .from("loans")
    .select("user_id")
    .in("user_id", rows.map((row) => row.id))
    .is("returned_at", null)
    .limit(OPEN_LOANS_LIMIT);
  if (loans.error) throw new Error("Não foi possível consultar os empréstimos.");
  const openByUser = new Map<string, number>();
  for (const loan of loans.data) openByUser.set(loan.user_id, (openByUser.get(loan.user_id) ?? 0) + 1);

  return {
    users: rows.map((row) => toUserView(row, openByUser.get(row.id) ?? 0, selfId)),
    counts,
    total,
    page,
    pages,
    pageSize: PAGE_SIZE,
  };
}

function failure(action: string, error: { message?: string; code?: string }): UserAdminResult {
  // Só um código vai para o log (nunca nome, e-mail, telefone ou matrícula).
  const code = userAdminErrorCode(error);
  console.error(`Falha ao ${action}:`, code ?? error.code ?? "desconhecido");
  return { ok: false, message: userAdminErrorMessage(error), final: isFinalUserAdminError(error), code };
}

// Edição: quem decide é a função update_profile_admin do banco (só funcionária, valida, audita e é idempotente).
export async function updateUser(userId: string, values: UserEditValues, idempotencyKey: string): Promise<UserAdminResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("update_profile_admin", toUpdateArgs(userId, values, idempotencyKey));
  return error ? failure("editar o usuário", error) : { ok: true };
}

// Inativar ou reativar: set_profile_active. Com empréstimo em aberto, inativar só passa com confirmOpenLoans = true.
export async function setUserActive(
  userId: string,
  active: boolean,
  confirmOpenLoans: boolean,
  idempotencyKey: string,
): Promise<UserAdminResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("set_profile_active", {
    p_profile_id: userId,
    p_active: active,
    p_confirm_open_loans: confirmOpenLoans,
    p_idempotency_key: idempotencyKey,
  });
  return error ? failure(active ? "reativar o usuário" : "inativar o usuário", error) : { ok: true };
}
