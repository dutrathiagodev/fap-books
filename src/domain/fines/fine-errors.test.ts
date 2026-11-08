import { describe, expect, it } from "vitest";
import { FINE_ERROR_MESSAGES, fineErrorCode, fineErrorMessage, GENERIC_FINE_ERROR, isFinalFineError } from "./fine-errors";

describe("erros da baixa da multa", () => {
  it("traduz o código que o banco levanta", () => {
    expect(fineErrorMessage({ message: "fine_not_found" })).toBe(FINE_ERROR_MESSAGES.fine_not_found);
    expect(fineErrorMessage({ message: "idempotency_key_reused" })).toBe(FINE_ERROR_MESSAGES.idempotency_key_reused);
  });

  it("falta de permissão chega como SQLSTATE 42501", () => {
    expect(fineErrorCode({ code: "42501", message: "permission denied" })).toBe("forbidden");
    expect(fineErrorCode({ message: "forbidden" })).toBe("forbidden");
  });

  it("erro desconhecido vira a mensagem genérica, sem vazar o texto do banco", () => {
    expect(fineErrorMessage({ message: "connection refused to 10.0.0.1" })).toBe(GENERIC_FINE_ERROR);
    expect(fineErrorMessage({})).toBe(GENERIC_FINE_ERROR);
  });

  it("só erro de regra descarta a chave de idempotência", () => {
    expect(isFinalFineError({ message: "fine_not_found" })).toBe(true);
    expect(isFinalFineError({ code: "42501" })).toBe(true);
    expect(isFinalFineError({ message: "fetch failed" })).toBe(false);
  });
});
