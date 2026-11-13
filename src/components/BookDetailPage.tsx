import { notFound } from "next/navigation";
import { cancelReservationAction, expireReservationAction, reserveBookAction } from "@/app/actions/reservations";
import { getBookDetail } from "@/services/books.service";
import { getBookReservationInfo, listBookQueue } from "@/services/reservations.service";
import type { UserRole } from "@/types/profile";
import { BookDetailView } from "./BookDetailView";
import { BookQueuePanel } from "./BookQueuePanel";
import { ReserveBookPanel } from "./ReserveBookPanel";
import { RolePage } from "./RolePage";

interface BookDetailPageProps {
  // Quem pode abrir: a conferência de perfil é feita no servidor (RolePage), além do proxy.ts.
  role: UserRole;
  // Endereço da pesquisa (ex.: "/aluno/livros"): o "Voltar" aponta para ele.
  basePath: string;
  params: Promise<{ id: string }>;
}

// Detalhe do livro (Figma, card 0111) para os três perfis. Aluno e professor reservam livro indisponível e acompanham a
// fila; a funcionária também abre livro inativo e vê quem está na fila (pode cancelar ou expirar). O id vem do endereço e
// só vira consulta se for um UUID; livro que não existe (ou está inativo, para aluno e professor) cai no 404.
export function BookDetailPage({ role, basePath, params }: BookDetailPageProps) {
  return (
    <RolePage role={role}>
      {async () => {
        const { id } = await params;
        const book = await getBookDetail(id, role === "librarian");
        if (!book) notFound();

        if (role === "librarian") {
          const entries = await listBookQueue(book.id);
          return (
            <BookDetailView
              book={book}
              backHref={basePath}
              queue={
                <BookQueuePanel bookTitle={book.title} entries={entries} onCancel={cancelReservationAction} onExpire={expireReservationAction} />
              }
            />
          );
        }

        const info = await getBookReservationInfo(book.id);
        return (
          <BookDetailView
            book={book}
            backHref={basePath}
            reservation={
              <ReserveBookPanel
                bookId={book.id}
                situation={book.situation}
                info={info}
                onReserve={reserveBookAction}
                onCancel={cancelReservationAction}
              />
            }
          />
        );
      }}
    </RolePage>
  );
}
