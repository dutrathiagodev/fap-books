import { connection } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { bookSituation } from "@/domain/books/book-rules";
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
export async function searchUsers(term: string): Promise<LoanUserCard[]> {
  await connection();
  const supabase = await createSupabaseServerClient();
  const pattern = escapeLike(term);
  const columns = "id, full_name, role, registration, course, job_title";

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

  const ids = users.map((user) => user.id);
  const [loans, fines] = await Promise.all([
    supabase.from("loans").select("user_id").in("user_id", ids).is("returned_at", null),
    supabase.from("fines").select("user_id, amount_cents").in("user_id", ids).is("paid_at", null),
  ]);
  if (loans.error || fines.error) throw new Error("Não foi possível consultar os empréstimos do usuário.");

  return users.map((user) =>
    toLoanUserCard(
      user,
      loans.data.filter((loan) => loan.user_id === user.id).length,
      fines.data.filter((fine) => fine.user_id === user.id).reduce((sum, fine) => sum + fine.amount_cents, 0),
    ),
  );
}

// Uma linha de book_availability: só contagens por livro, nunca quem pegou ou reservou.
interface ShelfRow {
  book_id: string;
  open_loans: number;
  has_active_reservation: boolean;
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
  const shelfByBook = new Map((shelf.data as ShelfRow[]).map((row) => [row.book_id, row]));

  return books.map((book) => {
    const state = shelfByBook.get(book.id);
    return {
      title: book.title,
      author: book.author,
      code: book.code,
      coverUrl: book.cover_url,
      situation: bookSituation({
        quantity: book.quantity,
        status: "active",
        openLoans: state?.open_loans ?? 0,
        hasActiveReservation: state?.has_active_reservation ?? false,
      }),
    };
  });
}
