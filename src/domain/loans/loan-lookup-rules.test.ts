import { describe, expect, it } from "vitest";
import { escapeLike, initialsOf, LOOKUP_MAX_LENGTH, parseLookupTerm, toLoanUserCard } from "./loan-lookup-rules";

describe("parseLookupTerm", () => {
  it("junta espaços e tira as pontas", () => {
    expect(parseLookupTerm("  Maria   da  Silva ")).toEqual({ ok: true, term: "Maria da Silva" });
  });
  it("recusa termo vazio ou com uma letra só", () => {
    expect(parseLookupTerm("   ")).toEqual({ ok: false, reason: "term_too_short" });
    expect(parseLookupTerm("a")).toEqual({ ok: false, reason: "term_too_short" });
  });
  it("aceita o mínimo de duas letras", () => {
    expect(parseLookupTerm("Jo")).toEqual({ ok: true, term: "Jo" });
  });
  it("tira asterisco (o PostgREST o troca por curinga) e caracteres de controle", () => {
    expect(parseLookupTerm("*\u0000Ana\n*")).toEqual({ ok: true, term: "Ana" });
    expect(parseLookupTerm("**")).toEqual({ ok: false, reason: "term_too_short" });
  });
  it("corta no tamanho máximo", () => {
    const result = parseLookupTerm("a".repeat(500));
    expect(result.ok && result.term.length).toBe(LOOKUP_MAX_LENGTH);
  });
  it("mantém acento, apóstrofo e hífen (nomes e tombos reais)", () => {
    expect(parseLookupTerm("D'Ávila T-001")).toEqual({ ok: true, term: "D'Ávila T-001" });
  });
});

describe("escapeLike", () => {
  it("transforma curingas em texto comum", () => {
    expect(escapeLike("100%_ok")).toBe("100\\%\\_ok");
  });
  it("escapa a própria barra invertida", () => {
    expect(escapeLike("a\\b")).toBe("a\\\\b");
  });
  it("não mexe em texto sem curinga", () => {
    expect(escapeLike("Dom Casmurro")).toBe("Dom Casmurro");
  });
});

describe("initialsOf", () => {
  it("usa o primeiro nome e o último sobrenome", () => {
    expect(initialsOf("maria da Silva")).toBe("MS");
  });
  it("nome único tem uma inicial", () => {
    expect(initialsOf("Ana")).toBe("A");
  });
  it("nome vazio vira ponto de interrogação", () => {
    expect(initialsOf("  ")).toBe("?");
  });
});

describe("toLoanUserCard", () => {
  const student = {
    full_name: "Ana Souza",
    role: "student" as const,
    registration: "2024001",
    course: "Enfermagem",
    job_title: null,
  };

  it("sem multa mostra 'Sem pendências' no tom ok", () => {
    expect(toLoanUserCard(student, 1, 0)).toMatchObject({
      initials: "AS",
      roleLabel: "Aluno",
      registration: "2024001",
      detail: "Enfermagem",
      activeLoans: 1,
      loanLimit: 3,
      pendingLabel: "Sem pendências",
      pendingTone: "ok",
    });
  });
  it("com multa escreve o valor em reais", () => {
    expect(toLoanUserCard(student, 0, 800)).toMatchObject({
      pendingLabel: "Multa em aberto: R$ 8,00",
      pendingTone: "danger",
    });
  });
  it("empréstimo em atraso também é pendência, no tom de perigo", () => {
    expect(toLoanUserCard(student, 2, 0, 1)).toMatchObject({ pendingLabel: "Livro em atraso: 1", pendingTone: "danger" });
  });
  it("multa em aberto vem antes do atraso no texto", () => {
    expect(toLoanUserCard(student, 2, 400, 1).pendingLabel).toBe("Multa em aberto: R$ 4,00");
  });
  it("funcionário mostra o cargo, e dado faltando vira traço", () => {
    const librarian = { ...student, role: "librarian" as const, registration: null, course: null, job_title: "Chefe da biblioteca" };
    expect(toLoanUserCard(librarian, 0, 0)).toMatchObject({
      roleLabel: "Funcionário",
      registration: "—",
      detail: "Chefe da biblioteca",
    });
    expect(toLoanUserCard({ ...student, course: null }, 0, 0).detail).toBe("—");
  });
});
