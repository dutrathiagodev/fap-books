import { notFound } from "next/navigation";
import { getBookDetail } from "@/services/books.service";
import type { UserRole } from "@/types/profile";
import { BookDetailView } from "./BookDetailView";
import { RolePage } from "./RolePage";

interface BookDetailPageProps {
  // Quem pode abrir: a conferência de perfil é feita no servidor (RolePage), além do proxy.ts.
  role: UserRole;
  // Endereço da pesquisa (ex.: "/aluno/livros"): o "Voltar" aponta para ele.
  basePath: string;
  params: Promise<{ id: string }>;
}

// Detalhe do livro (Figma, card 0111) para os três perfis. A bibliotecária também abre livro inativo e não vê os botões
// de reserva. O id vem do endereço e só vira consulta se for um UUID; livro que não existe (ou está inativo, para
// aluno e professor) cai no 404.
export function BookDetailPage({ role, basePath, params }: BookDetailPageProps) {
  return (
    <RolePage role={role}>
      {async () => {
        const { id } = await params;
        const book = await getBookDetail(id, role === "librarian");
        if (!book) notFound();

        return <BookDetailView book={book} backHref={basePath} canReserve={role !== "librarian"} />;
      }}
    </RolePage>
  );
}
