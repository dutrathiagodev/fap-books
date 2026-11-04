import { Suspense } from "react";
import { AppShell, BookEditForm, BookFormSave, LoadingState } from "@/components";
import { requireRole } from "@/lib/require-role";
import { getBookForEdit } from "@/services/books.service";
import { updateBookAction } from "./actions";

type PageParams = { params: Promise<{ id: string }> };

// A página lê quem está logado e o livro, por isso fica dentro do Suspense.
async function EditarLivroContent({ params }: PageParams) {
  const profile = await requireRole("librarian");
  const { id } = await params;
  const book = await getBookForEdit(id);

  return (
    <AppShell profile={profile}>
      {book ? (
        <BookEditForm book={book} onUpdate={updateBookAction.bind(null, book.id)} />
      ) : (
        <BookFormSave mode="edit" empty />
      )}
    </AppShell>
  );
}

export default function EditarLivroPage({ params }: PageParams) {
  return (
    <Suspense fallback={<LoadingState />}>
      <EditarLivroContent params={params} />
    </Suspense>
  );
}
