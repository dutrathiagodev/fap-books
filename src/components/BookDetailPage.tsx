import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/require-role";
import { getBookDetail } from "@/services/books.service";
import type { UserRole } from "@/types/profile";
import { AppShell } from "./AppShell";
import { BookDetailView } from "./BookDetailView";
import { LoadingState } from "./LoadingState";

interface BookDetailPageProps {
  // Quem pode abrir: a conferência de perfil é feita aqui no servidor, além do proxy.ts.
  role: Exclude<UserRole, "librarian">;
  // Endereço da pesquisa (ex.: "/aluno/livros"): o "Voltar" aponta para ele.
  basePath: string;
  params: Promise<{ id: string }>;
}

// Detalhe do livro de alunos e professores (Figma, card 0111). O id vem do endereço e só vira consulta se for um
// UUID; livro que não existe ou está inativo cai no 404.
async function BookDetailContent({ role, basePath, params }: BookDetailPageProps) {
  const profile = await requireRole(role);
  const { id } = await params;
  const book = await getBookDetail(id);
  if (!book) notFound();

  return (
    <AppShell profile={profile}>
      <BookDetailView book={book} backHref={basePath} />
    </AppShell>
  );
}

export function BookDetailPage(props: BookDetailPageProps) {
  return (
    <Suspense fallback={<LoadingState />}>
      <BookDetailContent {...props} />
    </Suspense>
  );
}
