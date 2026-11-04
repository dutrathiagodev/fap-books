import { Suspense } from "react";
import { AppShell, BookCoverUpload, BookFormFields, BookFormSave, LoadingState } from "@/components";
import { requireRole } from "@/lib/require-role";

// A página lê quem está logado, por isso fica dentro do Suspense.
async function NovoLivroContent() {
  const profile = await requireRole("librarian");

  return (
    <AppShell profile={profile}>
      <BookFormSave mode="create">
        <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-[minmax(0,1fr)_16.25rem] md:gap-8">
          <div className="md:col-start-2 md:row-start-1">
            <BookCoverUpload />
          </div>
          <div className="md:col-start-1 md:row-start-1">
            <BookFormFields />
          </div>
        </div>
      </BookFormSave>
    </AppShell>
  );
}

export default function NovoLivroPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <NovoLivroContent />
    </Suspense>
  );
}
