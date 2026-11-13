import { formatReais } from "../fines/fine-rules";
import { PEDAGOGICAL_STATUS_LABELS } from "./report-rules";
import type { ExportTable, InventoryRowView, OverdueRowView, PedagogicalRowView } from "@/types/report";

// ---- Tabelas prontas para exportar (mesmos números da tela, em texto) ----

export function overdueTable(rows: OverdueRowView[], subtitle: string, omitted: number): ExportTable {
  return {
    title: "Relatório de livros em atraso",
    subtitle,
    headers: ["Usuário", "Matrícula", "Livro", "Tombo", "Prazo", "Devolução", "Dias de atraso", "Multa estimada"],
    rows: rows.map((row) => [
      row.userName,
      row.registration,
      row.bookTitle,
      row.code,
      row.dueOn,
      row.returnedOn ?? "",
      String(row.daysLate),
      formatReais(row.fineCents),
    ]),
    omitted,
  };
}

export function inventoryTable(rows: InventoryRowView[], subtitle: string, omitted: number): ExportTable {
  return {
    title: "Relatório do acervo por categoria",
    subtitle,
    headers: ["Categoria", "Títulos ativos", "Exemplares", "Disponíveis", "Emprestados", "Reservados", "Títulos inativos", "Exemplares inativos"],
    rows: rows.map((row) => [
      row.category,
      String(row.titles),
      String(row.copies),
      String(row.available),
      String(row.borrowed),
      String(row.held),
      String(row.inactiveTitles),
      String(row.inactiveCopies),
    ]),
    omitted,
  };
}

export function pedagogicalTable(rows: PedagogicalRowView[], subtitle: string, omitted: number): ExportTable {
  return {
    title: "Relatório de reservas pedagógicas",
    subtitle,
    headers: ["Professor", "Situação", "Pedido em", "Início", "Dias", "Disciplina ou turma", "Livros"],
    rows: rows.map((row) => [
      row.teacherName,
      PEDAGOGICAL_STATUS_LABELS[row.status],
      row.requestedOn,
      row.startOn,
      String(row.days),
      row.purpose ?? "",
      row.bookTitles.join("; ") + (row.bookCount > row.bookTitles.length ? `; e mais ${row.bookCount - row.bookTitles.length}` : ""),
    ]),
    omitted,
  };
}

// ---- CSV ----

const BOM = "﻿";
// Ponto e vírgula: é o separador que o Excel em português abre direto, em colunas.
const SEPARATOR = ";";

// Célula que começa com = + - @ (ou tabulação/retorno) vira fórmula no Excel e no Planilhas: o apóstrofo segura o texto.
// Nomes e títulos vêm de cadastro digitado por pessoas, então todo texto passa por aqui (OWASP: CSV injection).
export function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[";\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

// CSV em UTF-8 com BOM (o Excel reconhece os acentos) e quebra de linha CRLF.
export function toCsv(table: ExportTable): string {
  const lines = [table.headers, ...table.rows].map((row) => row.map(csvCell).join(SEPARATOR));
  return `${BOM}${lines.join("\r\n")}\r\n`;
}

// ---- PDF (escrito à mão: sem dependência, só texto em tabela) ----

// A4 deitada, em pontos (1 pt = 1/72 pol).
const PAGE_W = 842;
const PAGE_H = 595;
const MARGIN = 36;
const FONT = 8;
const LEADING = 14;
const HEADER_FONT = 8;
// Largura média de uma letra da Helvetica: 0,5 do corpo (conta conservadora para cortar o texto sem estourar a coluna).
const CHAR_W = 0.5;

// O PDF usa a codificação WinAnsi: as letras do português (Latin-1) passam direto, o resto vira "?".
function toLatin1(text: string): string {
  return Array.from(text.replace(/[\u0000-\u001F\u007F]/g, " "))
    .map((char) => (char.codePointAt(0)! <= 0xff ? char : "?"))
    .join("");
}

function pdfText(text: string): string {
  return toLatin1(text).replace(/[\\()]/g, (char) => `\\${char}`);
}

// Corta o texto para caber na largura da coluna.
export function fitText(text: string, width: number, fontSize = FONT): string {
  const max = Math.max(1, Math.floor(width / (fontSize * CHAR_W)));
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, Math.max(0, max - 3))}...`;
}

// Larguras das colunas: proporcionais ao maior texto de cada uma (entre 6 e 40 letras), somando a área útil.
export function columnWidths(table: ExportTable, total: number): number[] {
  const weights = table.headers.map((header, index) => {
    const longest = Math.max(header.length, ...table.rows.slice(0, 200).map((row) => (row[index] ?? "").length));
    return Math.min(40, Math.max(6, longest));
  });
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map((weight) => (weight / sum) * total);
}

// Linhas por página (cabeçalho do relatório na primeira; a tabela repete o cabeçalho de colunas em todas).
const FIRST_PAGE_ROWS = Math.floor((PAGE_H - 2 * MARGIN - 70) / LEADING);
const OTHER_PAGE_ROWS = Math.floor((PAGE_H - 2 * MARGIN - 30) / LEADING);

export function pdfPageCount(rowCount: number): number {
  if (rowCount <= FIRST_PAGE_ROWS) return 1;
  return 1 + Math.ceil((rowCount - FIRST_PAGE_ROWS) / OTHER_PAGE_ROWS);
}

// Gera o PDF (Helvetica, A4 deitada, tabela com cabeçalho repetido, rodapé com data e página). generatedOn: "13/11/2026".
export function toPdf(table: ExportTable, generatedOn: string): Uint8Array {
  const widths = columnWidths(table, PAGE_W - 2 * MARGIN);
  const pages = pdfPageCount(table.rows.length);
  const streams: string[] = [];

  let rowIndex = 0;
  for (let page = 0; page < pages; page++) {
    const ops: string[] = [];
    let y = PAGE_H - MARGIN;
    const text = (x: number, yy: number, value: string, size: number, bold = false) =>
      ops.push(`BT /${bold ? "F2" : "F1"} ${size} Tf ${x.toFixed(2)} ${yy.toFixed(2)} Td (${pdfText(value)}) Tj ET`);

    if (page === 0) {
      text(MARGIN, y - 12, table.title, 16, true);
      text(MARGIN, y - 30, table.subtitle, 9);
      y -= 52;
    } else {
      y -= 8;
    }

    // Cabeçalho das colunas.
    let x = MARGIN;
    table.headers.forEach((header, index) => {
      text(x, y - 10, fitText(header, widths[index] - 6, HEADER_FONT), HEADER_FONT, true);
      x += widths[index];
    });
    ops.push(`0.5 w ${MARGIN} ${(y - 14).toFixed(2)} m ${PAGE_W - MARGIN} ${(y - 14).toFixed(2)} l S`);
    y -= 14 + LEADING - 4;

    const capacity = page === 0 ? FIRST_PAGE_ROWS : OTHER_PAGE_ROWS;
    for (let n = 0; n < capacity && rowIndex < table.rows.length; n++, rowIndex++) {
      x = MARGIN;
      table.rows[rowIndex].forEach((cell, index) => {
        text(x, y, fitText(cell, widths[index] - 6), FONT);
        x += widths[index];
      });
      y -= LEADING;
    }

    if (table.rows.length === 0) text(MARGIN, y, "Nenhum registro para os filtros escolhidos.", FONT);
    if (page === pages - 1 && table.omitted > 0) {
      text(MARGIN, y - 4, `Mostrando as primeiras ${table.rows.length} linhas; mais ${table.omitted} não couberam nesta exportação.`, FONT);
    }
    text(MARGIN, MARGIN - 14, `FAP Books · gerado em ${generatedOn} · contém dados pessoais (LGPD): não compartilhe`, 7);
    text(PAGE_W - MARGIN - 60, MARGIN - 14, `Página ${page + 1} de ${pages}`, 7);
    streams.push(ops.join("\n"));
  }

  // Objetos: 1 catálogo, 2 páginas, 3 e 4 fontes, depois (página, conteúdo) de cada página.
  const objects: string[] = [];
  const kids = streams.map((_, i) => `${5 + i * 2} 0 R`).join(" ");
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push(`<< /Type /Pages /Kids [${kids}] /Count ${streams.length} >>`);
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  streams.forEach((stream, i) => {
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${6 + i * 2} 0 R >>`,
    );
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });

  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  out += offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;

  // Todo caractere já é Latin-1: um caractere = um byte, e os deslocamentos do xref batem.
  return Uint8Array.from(out, (char) => char.charCodeAt(0));
}
