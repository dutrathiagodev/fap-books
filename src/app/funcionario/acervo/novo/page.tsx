import { BookCreateForm, BookFormTabs, BookImportPage } from "@/components";
import { RolePage } from "@/components/RolePage";
import { createBookAction, importBooksAction } from "./actions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// A aba vem do endereço (?aba=importar). Qualquer outro valor cai no formulário manual.
export default function NovoLivroPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <RolePage role="librarian">
      {async () => {
        const { aba } = await searchParams;
        if (aba === "importar") return <BookImportPage onImport={importBooksAction} />;
        return <BookCreateForm onCreate={createBookAction} tabs={<BookFormTabs active="manual" />} />;
      }}
    </RolePage>
  );
}
