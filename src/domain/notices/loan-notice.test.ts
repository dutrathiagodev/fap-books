import { describe, expect, it } from "vitest";
import { buildLoanNoticeEmail, noticeKindFor, noticePreferencesPath, type LoanNoticeInput } from "./loan-notice";

// Horários dados em Brasília (UTC−3).
const at = (isoLocal: string) => new Date(`${isoLocal}-03:00`);
const NOW = at("2026-11-13T12:00:00"); // sexta

describe("noticeKindFor (mesma regra do SQL)", () => {
  it.each([
    ["2026-11-16T18:00:00", null], // 3 dias: ainda não
    ["2026-11-15T18:00:00", "due_soon"], // 2 dias
    ["2026-11-14T00:00:00", "due_soon"], // 1 dia, mesmo à meia-noite
    ["2026-11-13T23:59:00", "due_today"], // hoje, mesmo à noite
    ["2026-11-13T00:00:00", "due_today"],
    ["2026-11-12T23:59:00", "overdue"], // ontem
    ["2026-10-01T10:00:00", "overdue"],
  ])("prazo %s -> %s", (due, expected) => {
    expect(noticeKindFor(at(due), NOW)).toBe(expected);
  });

  it("conta o dia pelo calendário de Brasília, não pelo UTC", () => {
    // 22h de Brasília já é o dia seguinte em UTC: continua "vence hoje".
    expect(noticeKindFor(at("2026-11-13T22:00:00"), at("2026-11-13T09:00:00"))).toBe("due_today");
  });
});

const base: LoanNoticeInput = {
  kind: "due_soon",
  fullName: "Ana Maria Souza",
  bookTitle: "Dom Casmurro",
  dueAt: at("2026-11-15T18:00:00"),
  daysLate: 0,
  role: "student",
  siteOrigin: "https://fap-books.vercel.app",
};

describe("buildLoanNoticeEmail", () => {
  it("a vencer: assunto com o livro e a data, saudação pelo primeiro nome", () => {
    const email = buildLoanNoticeEmail(base);
    expect(email.subject).toBe('Devolução em breve: "Dom Casmurro" vence em 15/11/2026');
    expect(email.text).toContain("Olá, Ana!");
    expect(email.text).toContain("termina em 15/11/2026");
  });

  it("vence hoje", () => {
    const email = buildLoanNoticeEmail({ ...base, kind: "due_today", dueAt: at("2026-11-13T18:00:00") });
    expect(email.subject).toBe('O livro "Dom Casmurro" vence hoje');
    expect(email.html).toContain("Seu livro vence hoje");
  });

  it("atrasado: dias, multa de R$ 1,00 por dia e total", () => {
    const email = buildLoanNoticeEmail({ ...base, kind: "overdue", dueAt: at("2026-11-10T18:00:00"), daysLate: 3 });
    expect(email.subject).toBe('O livro "Dom Casmurro" está atrasado');
    expect(email.text).toContain("3 dias de atraso");
    expect(email.text).toContain("R$ 1,00 por dia (hoje: R$ 3,00)");
  });

  it("atrasado há 1 dia usa o singular", () => {
    const email = buildLoanNoticeEmail({ ...base, kind: "overdue", daysLate: 1 });
    expect(email.text).toContain("1 dia de atraso");
  });

  it("leva a logo, os dados da biblioteca e o link da área do aluno", () => {
    const email = buildLoanNoticeEmail(base);
    expect(email.html).toContain('src="https://fap-books.vercel.app/logo-modo-escuro.png"');
    expect(email.html).toContain('href="https://fap-books.vercel.app/aluno"');
    expect(email.html).toContain("(44) 3236-8065");
    expect(email.html).toContain("Segunda a quinta, das 8h às 22h30");
    expect(email.text).toContain("https://fap-books.vercel.app/aluno");
  });

  it("explica como não receber mais, com o link da tela de preferência do perfil", () => {
    expect(buildLoanNoticeEmail(base).html).toContain("https://fap-books.vercel.app/aluno/avisos");
    expect(buildLoanNoticeEmail({ ...base, role: "teacher" }).text).toContain("https://fap-books.vercel.app/professor/avisos");
    expect(noticePreferencesPath("librarian")).toBe("/funcionario/avisos");
  });

  it("escapa HTML do título e do nome (nada vira marcação)", () => {
    const email = buildLoanNoticeEmail({ ...base, bookTitle: '<img src=x onerror="a()">&Co', fullName: "<b>Ana</b> X" });
    expect(email.html).not.toContain("<img src=x");
    expect(email.html).not.toContain("<b>Ana</b>");
    expect(email.html).toContain("&lt;img src=x onerror=&quot;a()&quot;&gt;&amp;Co");
  });

  it("assunto em uma linha só, mesmo com quebra de linha no título", () => {
    const email = buildLoanNoticeEmail({ ...base, bookTitle: "Linha 1\r\nBcc: x@y.com" });
    expect(email.subject).not.toMatch(/[\r\n]/);
  });

  it("sem nome, só 'Olá!'", () => {
    expect(buildLoanNoticeEmail({ ...base, fullName: "  " }).text.startsWith("Olá!")).toBe(true);
  });
});
