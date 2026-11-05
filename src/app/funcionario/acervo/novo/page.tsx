import { Suspense } from "react";
import { AppShell, BookCreateForm, LoadingState } from "@/components";
import { requireRole } from "@/lib/require-role";
import { createBookAction } from "./actions";

// A página lê quem está logado, por isso fica dentro do Suspense.
async function NovoLivroContent() {
  const profile = await requireRole("librarian");

  return (
    <AppShell profile={profile}>
      <BookCreateForm onCreate={createBookAction} />
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
