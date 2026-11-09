import type { BookImportResult } from "@/types/book";
import { BookFormTabs } from "./BookFormTabs";
import { BookImportForm } from "./BookImportForm";
import { PageHeader } from "./PageHeader";

// Cadastro de livro, aba "Importar planilha" (Figma, card 0117): cabeçalho e abas iguais às do formulário manual.
export function BookImportPage({ onImport }: { onImport: (formData: FormData) => Promise<BookImportResult> }) {
  return (
    <div>
      <PageHeader
        title="Cadastro de livro"
        breadcrumbs={[{ label: "Acervo" }, { label: "Novo livro" }]}
        description="Importe vários livros de uma vez com uma planilha .csv ou .xlsx."
      />
      <BookFormTabs active="import" />
      <BookImportForm onImport={onImport} />
    </div>
  );
}
