import { BookEditForm, BookFormSave } from "@/components";
import { RolePage } from "@/components/RolePage";
import { getBookForEdit } from "@/services/books.service";
import { updateBookAction } from "./actions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Editar livro | FAP Books" };

type PageParams = { params: Promise<{ id: string }> };

// Lê o livro do endereço, por isso roda dentro do Suspense do RolePage.
export default function EditarLivroPage({ params }: PageParams) {
  return (
    <RolePage role="librarian">
      {async () => {
        const { id } = await params;
        const book = await getBookForEdit(id);

        return book ? (
          <BookEditForm book={book} onUpdate={updateBookAction.bind(null, book.id)} />
        ) : (
          <BookFormSave mode="edit" empty />
        );
      }}
    </RolePage>
  );
}
