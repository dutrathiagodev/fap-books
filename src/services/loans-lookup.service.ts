import { connection } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { recordAudit } from "./audit.service";
import { shelfByBook, shelfStatus, type ShelfRow } from "./book-shelf";
import { isOverdue } from "@/domain/loans/loan-rules";
import { escapeLike, LOOKUP_MAX_RESULTS, toLoanUserCard, type LoanUserRow } from "@/domain/loans/loan-lookup-rules";
import type { LoanBookCard, LoanUserCard } from "@/components/LoanSearch";

// Junta os resultados das consultas por coluna, sem repetir. O termo já chega limpo (parseLookupTerm) e cada coluna
// é consultada à parte com .ilike(): o valor vai como parâmetro, nunca dentro de um texto de filtro (.or), então
// vírgula ou parêntese digitados não mudam a consulta.
async function mergeById<Row extends { id: string }>(
  searches: PromiseLike<{ data: Row[] | null; error: unknown }>[],
): Promise<Row[]> {
  const results = await Promise.all(searches);
  if (results.some((result) => result.error)) throw new Error("Não foi possível fazer a consulta.");
  return [...new Map(results.flatMap((result) => result.data ?? []).map((row) => [row.id, row])).values()];
}

type ProfileRow = LoanUserRow & { id: string };

// Usuários ativos pelo nome (contém) ou pela matrícula (começa com). Só a bibliotecária enxerga todos os perfis (RLS).
// Devolve só o que o cartão mostra: sem e-mail e sem id.
export async function searchUsers(term: string, actorId: string): Promise<LoanUserCard[]> {
  await connection();
  const supabase = await createSupabaseServerClient();
  const pattern = escapeLike(term);
  const columns = "id, full_name, role, registration, course, job_title, graduating";

  const found = await mergeById<ProfileRow>([
    supabase
      .from("profiles")
      .select(columns)
      .eq("active", true)
      .ilike("full_name", `%${pattern}%`)
      .order("full_name")
      .limit(LOOKUP_MAX_RESULTS),
    supabase
      .from("profiles")
      .select(columns)
      .eq("active", true)
      .ilike("registration", `${pattern}%`)
      .order("registration")
      .limit(LOOKUP_MAX_RESULTS),
  ]);
  const users = found.sort((a, b) => a.full_name.localeCompare(b.full_name, "pt-BR")).slice(0, LOOKUP_MAX_RESULTS);
  if (users.length === 0) return [];

  // Dado pessoal consultado: fica registrado quem viu cada perfil (sem o termo digitado, só ids).
  await Promise.all(users.map((user) => recordAudit({ actorId, action: "profile_viewed", entity: "profiles", entityId: user.id })));

  const ids = users.map((user) => user.id);
  const [loans, fines] = await Promise.all([
    supabase.from("loans").select("user_id, due_at").in("user_id", ids).is("returned_at", null),
    supabase.from("fines").select("user_id, amount_cents").in("user_id", ids).is("paid_at", null),
  ]);
  if (loans.error || fines.error) throw new Error("Não foi possível consultar os empréstimos do usuário.");

  const now = new Date();
  return users.map((user) => {
    const userLoans = loans.data.filter((loan) => loan.user_id === user.id);
    return toLoanUserCard(
      user,
      userLoans.length,
      fines.data.filter((fine) => fine.user_id === user.id).reduce((sum, fine) => sum + fine.amount_cents, 0),
      userLoans.filter((loan) => isOverdue(new Date(loan.due_at), now)).length,
    );
  });
}

interface BookRow {
  id: string;
  title: string;
  author: string;
  code: string;
  quantity: number;
  cover_url: string | null;
}

// Livros ativos pelo título (contém) ou pelo tombo, que é o código do livro (começa com). Livro inativo não sai do
// acervo para empréstimo. A situação vem da função book_availability, a mesma da pesquisa de alunos e professores.
export async function searchBooksForLoan(term: string): Promise<LoanBookCard[]> {
  await connection();
  const supabase = await createSupabaseServerClient();
  const pattern = escapeLike(term);
  const columns = "id, title, author, code, quantity, cover_url";

  const found = await mergeById<BookRow>([
    supabase
      .from("books")
      .select(columns)
      .eq("status", "active")
      .ilike("title", `%${pattern}%`)
      .order("title")
      .limit(LOOKUP_MAX_RESULTS),
    supabase
      .from("books")
      .select(columns)
      .eq("status", "active")
      .ilike("code", `${pattern}%`)
      .order("code")
      .limit(LOOKUP_MAX_RESULTS),
  ]);
  const books = found.sort((a, b) => a.title.localeCompare(b.title, "pt-BR")).slice(0, LOOKUP_MAX_RESULTS);
  if (books.length === 0) return [];

  const shelf = await supabase.rpc("book_availability");
  if (shelf.error) throw new Error("Não foi possível consultar a situação dos livros.");
  const shelfRows = shelfByBook(shelf.data as ShelfRow[]);

  return books.map((book) => ({
    title: book.title,
    author: book.author,
    code: book.code,
    coverUrl: book.cover_url,
    situation: shelfStatus(book.quantity, shelfRows.get(book.id)).situation,
  }));
}
