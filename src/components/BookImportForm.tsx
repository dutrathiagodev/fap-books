"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CircleAlert, CircleCheck, Download, FileSpreadsheet } from "lucide-react";
import { ACERVO_PATH } from "@/domain/access/access-rules";
import { IMPORT_MAX_BYTES, IMPORT_MAX_ROWS, IMPORT_TEMPLATE, IMPORT_TEMPLATE_ROWS } from "@/domain/books/book-import";
import { XLSX_MIME, buildXlsx } from "@/domain/books/xlsx-writer";
import { plural } from "@/domain/format";
import type { BookImportResult } from "@/types/book";
import { TextLink } from "./TextLink";

const FAILURE_TEXT: Record<Exclude<Extract<BookImportResult, { ok: false }>["reason"], "missing_columns">, string> = {
  no_file: "Escolha um arquivo .csv ou .xlsx para importar.",
  unsupported_type: "Formato não aceito. Envie uma planilha .csv ou .xlsx.",
  macro: "Planilhas com macro (.xlsm) não são aceitas. Salve como .xlsx comum ou .csv e envie de novo.",
  invalid_file: "Não foi possível ler o arquivo. Confira se é uma planilha .csv ou .xlsx válida, salve de novo no Excel e envie.",
  too_big: `O arquivo passa de ${IMPORT_MAX_BYTES / 1024} KB. Divida a planilha em partes menores.`,
  empty: "A planilha não tem nenhum livro para importar.",
  too_many_rows: `A planilha tem mais de ${IMPORT_MAX_ROWS} livros. Envie em partes de até ${IMPORT_MAX_ROWS}.`,
  error: "Não foi possível importar agora. Tente novamente.",
};

// Cores do resumo: pastel no claro e fundo translúcido com texto claro no escuro, como os selos de status.
const SUMMARY_WARNING =
  "border-warning-700 bg-warning-100 text-warning-700 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-300";
const SUMMARY_SUCCESS =
  "border-success-700 bg-success-100 text-success-700 dark:border-green-400/40 dark:bg-green-400/10 dark:text-green-300";

// O modelo vai num endereço data:, sem rota nem arquivo no servidor. O BOM faz o Excel abrir os acentos certos.
const TEMPLATE_CSV_HREF = `data:text/csv;charset=utf-8,${encodeURIComponent(`﻿${IMPORT_TEMPLATE}`)}`;
// O modelo .xlsx (poucos KB) é montado aqui mesmo, a partir das mesmas linhas do .csv, e também vai num endereço data:.
const TEMPLATE_XLSX_HREF = `data:${XLSX_MIME};base64,${btoa(String.fromCharCode(...buildXlsx(IMPORT_TEMPLATE_ROWS)))}`;

interface BookImportFormProps {
  // A ação do servidor chega por prop: o componente não conhece o banco.
  onImport: (formData: FormData) => Promise<BookImportResult>;
}

// Aba "Importar planilha" do cadastro de livro (Figma, card 0117): envio do .csv ou .xlsx, planilhas modelo e resumo do resultado
// com a tabela de linhas que não entraram.
export function BookImportForm({ onImport }: BookImportFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<BookImportResult | null>(null);
  const [pending, startTransition] = useTransition();

  function send() {
    if (!file) return setResult({ ok: false, reason: "no_file" });
    const formData = new FormData();
    formData.set("planilha", file);
    startTransition(async () => {
      try {
        setResult(await onImport(formData));
      } catch {
        setResult({ ok: false, reason: "error" });
      }
    });
  }

  return (
    <div aria-busy={pending} className="max-w-5xl">
      <section className="rounded-lg border border-line bg-surface p-4 shadow-sm md:p-7">
        <label
          htmlFor="planilha"
          className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-line-strong px-6 py-10 text-center hover:bg-subtle focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus"
        >
          <FileSpreadsheet size={32} strokeWidth={1.5} aria-hidden className="text-brand" />
          <span className="text-base font-medium">{file ? file.name : "Escolher arquivo .csv ou .xlsx"}</span>
          <span className="text-xs text-ink-muted">
            Até {IMPORT_MAX_ROWS} livros e {IMPORT_MAX_BYTES / 1024} KB por envio. Colunas obrigatórias: titulo, autor,
            categoria, codigo e quantidade.
          </span>
          <input
            id="planilha"
            type="file"
            accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            disabled={pending}
            className="sr-only"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setResult(null);
            }}
          />
        </label>

        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <a href={TEMPLATE_XLSX_HREF} download="planilha-modelo-livros.xlsx" className="inline-flex items-center gap-2 text-link hover:underline">
            <Download size={16} strokeWidth={1.5} aria-hidden />
            Baixar planilha modelo (.xlsx)
          </a>
          <a href={TEMPLATE_CSV_HREF} download="planilha-modelo-livros.csv" className="inline-flex items-center gap-2 text-link hover:underline">
            <Download size={16} strokeWidth={1.5} aria-hidden />
            Baixar planilha modelo (.csv)
          </a>
        </div>
      </section>

      {result?.ok && (
        <section
          role="status"
          className={`mt-6 rounded-md border px-4 py-3 text-sm ${result.errors.length > 0 ? SUMMARY_WARNING : SUMMARY_SUCCESS}`}
        >
          <p className="flex items-center gap-2 font-medium">
            {result.errors.length > 0 ? <CircleAlert size={16} aria-hidden /> : <CircleCheck size={16} aria-hidden />}
            {result.imported} {plural(result.imported, "livro importado", "livros importados")}
            {result.errors.length > 0 && ` e ${result.errors.length} com erro`}.
          </p>
          {result.errors.length > 0 && (
            <>
              <p className="mt-1">Corrija as linhas abaixo na planilha e envie de novo (as que entraram não se repetem).</p>
              <table className="mt-3 w-full border-collapse bg-surface text-left text-ink">
                <thead>
                  <tr className="border-b border-line text-xs text-ink-muted">
                    <th scope="col" className="w-20 px-3 py-2 font-medium">Linha</th>
                    <th scope="col" className="px-3 py-2 font-medium">Problema</th>
                  </tr>
                </thead>
                <tbody>
                  {result.errors.map((error) => (
                    <tr key={error.line} className="border-b border-line last:border-0">
                      <td className="px-3 py-2">{error.line}</td>
                      <td className="px-3 py-2">{error.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          {result.imported > 0 && (
            <p className="mt-3">
              <TextLink href={ACERVO_PATH}>Ver o acervo</TextLink>
            </p>
          )}
        </section>
      )}

      {result && !result.ok && (
        <p role="alert" className="mt-6 flex items-start gap-2 rounded-md border border-danger-700 bg-danger-100 px-3 py-2 text-sm text-danger-700 dark:border-red-400/40 dark:bg-red-400/10 dark:text-red-300">
          <CircleAlert size={16} strokeWidth={1.5} aria-hidden className="mt-0.5 shrink-0" />
          {result.reason === "missing_columns"
            ? `Faltam colunas na planilha: ${result.missing.join(", ")}. Use a planilha modelo.`
            : FAILURE_TEXT[result.reason]}
        </p>
      )}

      <div className="mt-6 flex flex-col-reverse gap-2 md:flex-row md:justify-end">
        <Link
          href={ACERVO_PATH}
          className="inline-flex h-11 w-full items-center justify-center rounded-md border border-line bg-surface px-4 text-sm font-medium text-ink hover:bg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus md:w-auto"
        >
          Cancelar
        </Link>
        <button
          type="button"
          onClick={send}
          disabled={pending}
          className="inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-md bg-brand px-4 text-sm font-medium text-on-brand hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-70 md:w-auto"
        >
          {pending ? "Importando..." : "Importar livros"}
        </button>
      </div>
    </div>
  );
}
