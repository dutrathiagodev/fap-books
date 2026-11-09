import { describe, expect, it } from "vitest";
import { buildHelpRequestMessage, buildLibraryChatUrl, buildNoticeMessage, buildWhatsAppUrl, normalizeBrazilianPhone } from "./whatsapp-link";

describe("normalizeBrazilianPhone", () => {
  it.each([
    ["44999887766", "5544999887766"],
    ["(44) 99988-7766", "5544999887766"],
    ["+55 44 99988-7766", "5544999887766"],
    ["554499988 7766", "5544999887766"],
    ["4432368065", "554432368065"], // fixo com DDD
    ["55991234567", "5555991234567"], // DDD 55 (RS) não é confundido com o código do país
  ])("%s -> %s", (raw, expected) => {
    expect(normalizeBrazilianPhone(raw)).toBe(expected);
  });

  it.each([[null], [undefined], [""], ["abc"], ["12345"], ["0044999887766"], ["44199887766"], ["449998877665544"]])(
    "%s é inválido",
    (raw) => {
      expect(normalizeBrazilianPhone(raw as string | null | undefined)).toBeNull();
    },
  );
});

describe("buildWhatsAppUrl", () => {
  it("monta o link com o texto codificado", () => {
    const url = buildWhatsAppUrl("(44) 99988-7766", 'Olá, "Ana"! Tudo bem?');
    expect(url).toBe(`https://wa.me/5544999887766?text=${encodeURIComponent('Olá, "Ana"! Tudo bem?')}`);
  });

  it("sem telefone válido não há link", () => {
    expect(buildWhatsAppUrl(null, "oi")).toBeNull();
    expect(buildWhatsAppUrl("123", "oi")).toBeNull();
  });
});

describe("buildLibraryChatUrl", () => {
  it("abre a conversa com o número da biblioteca", () => {
    expect(buildLibraryChatUrl("554432368065", "Preciso de ajuda")).toBe("https://wa.me/554432368065?text=Preciso%20de%20ajuda");
  });
});

describe("buildNoticeMessage", () => {
  const base = { userName: "João Pedro Alves", bookTitle: "Banco de Dados", dueOn: "04/11/2026", daysLate: 0, fineLabel: "Multa: R$ 0,00" };

  it("atrasado: dias de atraso e multa", () => {
    const text = buildNoticeMessage({ ...base, status: "overdue", daysLate: 4, fineLabel: "Multa: R$ 4,00" });
    expect(text).toContain("Olá, João!");
    expect(text).toContain('"Banco de Dados"');
    expect(text).toContain("venceu em 04/11/2026 (4 dias de atraso)");
    expect(text).toContain("Multa: R$ 4,00");
  });

  it("atrasado há 1 dia usa o singular", () => {
    expect(buildNoticeMessage({ ...base, status: "overdue", daysLate: 1 })).toContain("(1 dia de atraso)");
  });

  it("vence hoje", () => {
    const text = buildNoticeMessage({ ...base, status: "today" });
    expect(text).toContain("vence hoje (04/11/2026)");
    expect(text).not.toContain("Multa");
  });

  it("a vencer", () => {
    const text = buildNoticeMessage({ ...base, status: "soon" });
    expect(text).toContain("vence em 04/11/2026");
    expect(text).toContain("devolver no prazo");
  });

  it("não vaza nada além do próprio empréstimo", () => {
    const text = buildNoticeMessage({ ...base, status: "overdue", daysLate: 2 });
    expect(text).not.toContain("Alves");
  });
});

describe("buildHelpRequestMessage", () => {
  it("leva a pergunta digitada, com espaços limpos", () => {
    expect(buildHelpRequestMessage("  posso   trazer um   convidado? ")).toBe("Olá! Vim pelo FAP Books e preciso de ajuda: posso trazer um convidado?");
  });

  it("sem pergunta, só pede ajuda", () => {
    expect(buildHelpRequestMessage("   ")).toBe("Olá! Vim pelo FAP Books e preciso de ajuda.");
  });

  it("corta pergunta muito longa em 200 caracteres", () => {
    const text = buildHelpRequestMessage("a".repeat(500));
    expect(text.endsWith("a".repeat(200))).toBe(true);
    expect(text.length).toBeLessThan(260);
  });
});
