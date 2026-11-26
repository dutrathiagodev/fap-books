import { cleanValues } from "@/domain/loan-records/loan-record-rules";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import type { LoanRecord, LoanRecordValues } from "@/types/loan-record";

// Controle de empréstimo de livros (atividade da disciplina): o caderno pessoal de quem está logado.
// O RLS da tabela loan_records deixa cada pessoa ler e mudar só os próprios registros; o user_id nasce do login no banco.
// Nenhum erro do banco vai para a tela; o log leva só o código.

interface RecordRow {
  id: string;
  book_title: string;
  author: string;
  reader_name: string;
  category: string;
  loaned_on: string;
  due_on: string;
  returned_on: string | null;
}

const COLUMNS = "id, book_title, author, reader_name, category, loaned_on, due_on, returned_on";
// Teto de linhas lidas: o PostgREST também corta em 1000 sem avisar.
const LIST_LIMIT = 500;

function toRecord(row: RecordRow): LoanRecord {
  return {
    id: row.id,
    bookTitle: row.book_title,
    author: row.author,
    readerName: row.reader_name,
    category: row.category,
    loanedOn: row.loaned_on,
    dueOn: row.due_on,
    returnedOn: row.returned_on,
  };
}

export type LoanRecordResult<T> = { ok: true; data: T } | { ok: false };

function failed(action: string, error: { code?: string }): { ok: false } {
  console.error(`Falha ao ${action}:`, error.code ?? "sem código");
  return { ok: false };
}

export async function listLoanRecords(): Promise<LoanRecordResult<LoanRecord[]>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("loan_records")
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .limit(LIST_LIMIT);
  if (error) return failed("listar os empréstimos", error);
  return { ok: true, data: (data as RecordRow[]).map(toRecord) };
}

export async function createLoanRecord(values: LoanRecordValues): Promise<LoanRecordResult<LoanRecord>> {
  const clean = cleanValues(values);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("loan_records")
    .insert({
      book_title: clean.bookTitle,
      author: clean.author,
      reader_name: clean.readerName,
      category: clean.category,
      loaned_on: clean.loanedOn,
      due_on: clean.dueOn,
    })
    .select(COLUMNS)
    .single();
  if (error || !data) return failed("cadastrar o empréstimo", error ?? {});
  return { ok: true, data: toRecord(data as RecordRow) };
}

// Marca como devolvido na data informada (a tela manda o dia de hoje).
export async function markLoanRecordReturned(id: string, returnedOn: string): Promise<LoanRecordResult<LoanRecord>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("loan_records")
    .update({ returned_on: returnedOn })
    .eq("id", id)
    .is("returned_on", null)
    .select(COLUMNS)
    .maybeSingle();
  if (error) return failed("marcar a devolução", error);
  if (!data) return { ok: false };
  return { ok: true, data: toRecord(data as RecordRow) };
}

export async function deleteLoanRecord(id: string): Promise<LoanRecordResult<null>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("loan_records").delete().eq("id", id).select("id");
  if (error) return failed("excluir o empréstimo", error);
  return data.length === 1 ? { ok: true, data: null } : { ok: false };
}
