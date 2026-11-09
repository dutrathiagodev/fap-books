import { describe, expect, it } from "vitest";
import {
  GENERIC_USER_ADMIN_ERROR,
  USER_ADMIN_ERROR_MESSAGES,
  isFinalUserAdminError,
  userAdminErrorCode,
  userAdminErrorMessage,
} from "./user-admin-errors";

describe("erros da edição e da inativação de usuários", () => {
  it("traduz cada código que o banco levanta", () => {
    for (const [code, message] of Object.entries(USER_ADMIN_ERROR_MESSAGES)) {
      expect(userAdminErrorMessage({ message: code })).toBe(message);
    }
  });

  it("falta de permissão chega como SQLSTATE 42501", () => {
    expect(userAdminErrorCode({ code: "42501", message: "permission denied" })).toBe("forbidden");
  });

  it("reconhece o código dentro de um texto maior", () => {
    expect(userAdminErrorCode({ message: "ERROR: has_open_loans (P0001)" })).toBe("has_open_loans");
  });

  it("erro desconhecido vira a mensagem genérica, sem vazar o texto do banco", () => {
    expect(userAdminErrorMessage({ message: "connection refused to 10.0.0.1" })).toBe(GENERIC_USER_ADMIN_ERROR);
    expect(userAdminErrorMessage({})).toBe(GENERIC_USER_ADMIN_ERROR);
  });

  it("só erro de regra descarta a chave de idempotência", () => {
    expect(isFinalUserAdminError({ message: "registration_taken" })).toBe(true);
    expect(isFinalUserAdminError({ code: "42501" })).toBe(true);
    expect(isFinalUserAdminError({ message: "fetch failed" })).toBe(false);
  });
});
