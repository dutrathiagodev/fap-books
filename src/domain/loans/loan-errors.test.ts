import { describe, expect, it } from "vitest";
import { GENERIC_LOAN_ERROR, loanErrorCode, loanErrorMessage, LOAN_ERROR_MESSAGES, type LoanErrorCode } from "./loan-errors";

// Os 16 códigos que as funções do banco levantam (create_loan, return_loan, renew_loan e os gatilhos).
const EXPECTED: [LoanErrorCode, string][] = [
  ["loan_limit_reached", "limite"],
  ["no_copy_available", "exemplar livre"],
  ["copy_reserved_for_others", "reservado"],
  ["user_has_pending", "multa"],
  ["user_inactive", "inativo"],
  ["user_not_found", "Usuário não encontrado"],
  ["book_inactive", "inativo"],
  ["book_not_found", "Livro não encontrado"],
  ["already_borrowed", "já está com"],
  ["loan_not_found", "Empréstimo não encontrado"],
  ["loan_already_returned", "já foi devolvido"],
  ["loan_overdue", "atraso"],
  ["book_has_reservations", "reservou"],
  ["renewal_limit_reached", "3 vezes"],
  ["forbidden", "permissão"],
  ["idempotency_key_reused", "já foi enviada"],
];

describe("loanErrorMessage: um teste por código", () => {
  it("cobre exatamente os códigos do mapa", () => {
    expect(EXPECTED.map(([code]) => code).sort()).toEqual(Object.keys(LOAN_ERROR_MESSAGES).sort());
  });

  it.each(EXPECTED)("%s vira a frase da tela", (code, trecho) => {
    const message = loanErrorMessage({ message: code, code: "P0001", hint: "texto do banco" });
    expect(message).toBe(LOAN_ERROR_MESSAGES[code]);
    expect(message).toContain(trecho);
    expect(message).not.toContain("texto do banco");
  });
});

describe("loanErrorCode", () => {
  it("falta de permissão chega como SQLSTATE 42501, com qualquer mensagem", () => {
    expect(loanErrorCode({ code: "42501", message: "permission denied for table loans" })).toBe("forbidden");
  });
  it("acha o código mesmo cercado de outro texto", () => {
    expect(loanErrorCode({ message: "erro", details: "no_copy_available: sem exemplar" })).toBe("no_copy_available");
  });
  it("erro desconhecido ou vazio não tem código e vira a mensagem genérica", () => {
    expect(loanErrorCode({ message: "deadlock detected", code: "40P01" })).toBeNull();
    expect(loanErrorCode(null)).toBeNull();
    expect(loanErrorMessage({ message: 'relation "loans" violates something' })).toBe(GENERIC_LOAN_ERROR);
  });
  it("usa as mesmas frases dos bloqueios conferidos na tela", () => {
    expect(loanErrorMessage({ message: "loan_limit_reached" })).toContain("limite");
    expect(loanErrorMessage({ message: "renewal_limit_reached" })).toContain("3 vezes");
  });
});
