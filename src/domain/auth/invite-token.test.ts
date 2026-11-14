import { describe, expect, it } from "vitest";
import { parseInviteLink } from "./invite-token";

const HASH = "a".repeat(64);

describe("parseInviteLink", () => {
  it("aceita um token_hash de 64 caracteres com type=invite", () => {
    expect(parseInviteLink(HASH, "invite")).toEqual({ tokenHash: HASH, type: "invite" });
  });

  it("aceita letras, números, hífen e sublinhado", () => {
    expect(parseInviteLink("Ab1-_" + "x".repeat(20), "invite")).not.toBeNull();
  });

  it("aceita type=recovery (redefinir a senha)", () => {
    expect(parseInviteLink(HASH, "recovery")).toEqual({ tokenHash: HASH, type: "recovery" });
  });

  it("recusa os outros tipos do Supabase (signup, magiclink, email_change...)", () => {
    expect(parseInviteLink(HASH, "signup")).toBeNull();
    expect(parseInviteLink(HASH, "magiclink")).toBeNull();
    expect(parseInviteLink(HASH, "email_change")).toBeNull();
    expect(parseInviteLink(HASH, "")).toBeNull();
  });

  it("recusa token ausente, repetido (lista) ou de outro tipo", () => {
    expect(parseInviteLink(undefined, "invite")).toBeNull();
    expect(parseInviteLink([HASH, HASH], "invite")).toBeNull();
    expect(parseInviteLink(HASH, undefined)).toBeNull();
    expect(parseInviteLink(null, "invite")).toBeNull();
  });

  it("recusa token curto, longo demais ou com caracteres estranhos", () => {
    expect(parseInviteLink("abc", "invite")).toBeNull();
    expect(parseInviteLink("a".repeat(257), "invite")).toBeNull();
    expect(parseInviteLink("a".repeat(63) + "/", "invite")).toBeNull();
    expect(parseInviteLink("a".repeat(30) + " ", "invite")).toBeNull();
    expect(parseInviteLink("<script>".padEnd(30, "a"), "invite")).toBeNull();
  });
});
