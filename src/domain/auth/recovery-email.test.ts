import { describe, expect, it } from "vitest";
import { parseRecoveryEmail } from "./recovery-email";

describe("parseRecoveryEmail", () => {
  it("aceita e normaliza (minúsculas, sem espaços nas pontas)", () => {
    expect(parseRecoveryEmail("  Maria.Silva+bib@Email.com.br ")).toEqual({ status: "valid", email: "maria.silva+bib@email.com.br" });
  });

  it.each([undefined, null, 42, ["a@b.com"], "", "   ", "maria", "maria@", "@email.com", "maria@email", "ma ria@email.com", "a@@b.com"])(
    "recusa %j",
    (value) => {
      expect(parseRecoveryEmail(value)).toEqual({ status: "invalid" });
    },
  );

  it("recusa e-mail com mais de 254 caracteres", () => {
    expect(parseRecoveryEmail(`${"a".repeat(250)}@b.co`)).toEqual({ status: "invalid" });
    expect(parseRecoveryEmail(`${"a".repeat(64)}@b.co`)).toMatchObject({ status: "valid" });
  });
});
