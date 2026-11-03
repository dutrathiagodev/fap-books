import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell, BookFormFields, LoadingState, PageHeader } from "@/components";
import { requireRole } from "@/lib/require-role";

// A página lê quem está logado, por isso fica dentro do Suspense.
async function NovoLivroContent() {
  const profile = await requireRole("librarian");

  return (
    <AppShell profile={profile}>
      <PageHeader
        title="Cadastro de livro"
        breadcrumbs={[{ label: "Acervo" }, { label: "Novo livro" }]}
        description="Preencha as informações catalográficas ou use a importação de planilha."
        action={
          <Link
            href="/funcionario/acervo"
            className="inline-flex h-11 items-center gap-2 rounded-md border border-line bg-surface px-4 text-sm font-medium text-brand hover:bg-subtle"
          >
            <ArrowLeft size={16} strokeWidth={1.5} aria-hidden />
            Voltar ao acervo
          </Link>
        }
      />

      <section className="max-w-3xl rounded-lg border border-line bg-surface p-4 shadow-sm md:p-6">
        <BookFormFields />
      </section>
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
