import { readSheet } from "read-excel-file/node";
// Import relativo (e não "@/"): o teste roda no vitest sem o atalho "@/", como em book-shelf.ts.
import { inspectXlsx, sheetToRows } from "../domain/books/book-import-xlsx";

// Leitura de planilha .xlsx para a importação de livros (FAP-0233). SÓ NO SERVIDOR: é chamada pela ação do servidor, e a
// biblioteca (read-excel-file) nunca entra no JavaScript do navegador.
//
// Defesas, na ordem: 1) inspectXlsx confere assinatura, estrutura do zip, tamanho depois de descompactado e macro SEM
// abrir o arquivo; 2) só a primeira aba é lida; 3) a biblioteca devolve valores (não calcula fórmulas, não segue links
// nem arquivos externos); 4) linhas e colunas lidas são limitadas; 5) qualquer falha da biblioteca vira "invalid_file",
// porque a mensagem dela pode citar detalhes internos e não serve para quem usa o sistema.
export type XlsxReadResult =
  | { ok: true; rows: string[][] }
  | { ok: false; reason: "invalid_file" | "macro" | "too_big" | "too_many_rows" };

export async function readXlsxRows(bytes: Uint8Array): Promise<XlsxReadResult> {
  const inspection = inspectXlsx(bytes);
  if (!inspection.ok) return inspection;

  try {
    const sheet = await readSheet(Buffer.from(bytes), 1, { trim: true });
    return sheetToRows(sheet);
  } catch {
    return { ok: false, reason: "invalid_file" };
  }
}
