import { describe, expect, it } from "vitest";
import { FAQ, findAnswer, normalizeText, SUGGESTIONS } from "./help-faq";

// Segunda, 09/11/2026, 10:00 em Brasília (13:00 UTC): a biblioteca está aberta.
const NOW = new Date("2026-11-09T13:00:00Z");

describe("normalizeText", () => {
  it("tira acento, pontuação e caixa", () => {
    expect(normalizeText("  Qual o HORÁRIO?!  ")).toBe("qual o horario");
  });
});

describe("findAnswer", () => {
  it.each([
    ["Qual o horário de funcionamento?", "horario"],
    ["abre no sábado?", "horario"],
    ["Quanto tempo posso ficar com o livro?", "prazo"],
    ["qual o prazo de devolução", "prazo"],
    ["Quantos livros posso pegar?", "limite"],
    ["sou formando, qual meu limite", "limite"],
    ["como renovar o prazo?", "renovacao"],
    ["quero prorrogar meu empréstimo", "renovacao"],
    ["tenho multa, como pago?", "multa"],
    ["atrasei a devolução", "multa"],
    ["como pego um livro emprestado", "emprestar"],
    ["posso reservar um livro emprestado?", "reserva"],
    ["como funciona a reserva pedagógica", "pedagogica"],
    ["sou professor e preciso de livros para a aula", "pedagogica"],
    ["como procuro um livro no acervo", "busca"],
    ["qual o telefone da biblioteca", "contato"],
    ["onde fica a biblioteca?", "contato"],
    ["esqueci minha senha", "acesso"],
    ["não recebi o convite", "acesso"],
    ["o que fazem com meus dados", "privacidade"],
  ])("%s -> %s", (question, id) => {
    expect(findAnswer(question)?.id).toBe(id);
  });

  it("saudação sozinha responde com a apresentação", () => {
    expect(findAnswer("Oi, bom dia!")?.id).toBe("ola");
    expect(findAnswer("preciso de ajuda")?.id).toBe("ola");
  });

  it("saudação junto de um assunto responde o assunto", () => {
    expect(findAnswer("bom dia, qual o horário?")?.id).toBe("horario");
  });

  it("pergunta fora do assunto ou vazia devolve null (o componente oferece o WhatsApp)", () => {
    expect(findAnswer("qual a capital da França")).toBeNull();
    expect(findAnswer("   ")).toBeNull();
    expect(findAnswer("???")).toBeNull();
  });

  it("não casa pedaço de palavra", () => {
    expect(findAnswer("boiada")).toBeNull();
  });
});

describe("respostas", () => {
  const answer = (id: string, now = NOW) => FAQ.find((entry) => entry.id === id)!.answer(now);

  it("usam as regras reais do sistema", () => {
    expect(answer("prazo")).toContain("7 dias");
    expect(answer("limite")).toContain("3 livros");
    expect(answer("limite")).toContain("4 para formandos");
    expect(answer("renovacao")).toContain("3 vezes");
    expect(answer("multa")).toContain("R$ 1,00");
  });

  it("o horário diz se está aberta agora", () => {
    expect(answer("horario")).toContain("Agora a biblioteca está aberta.");
    // Sábado, 10:00 em Brasília: fechada.
    expect(answer("horario", new Date("2026-11-14T13:00:00Z"))).toContain("Agora a biblioteca está fechada.");
  });

  it("o contato traz telefone, WhatsApp e e-mail oficiais", () => {
    const text = answer("contato");
    expect(text).toContain("(44) 3236-8067");
    expect(text).toContain("(44) 3236-8065");
    expect(text).toContain("biblioteca.fap@educadventista.org.br");
  });
});

describe("SUGGESTIONS", () => {
  it("só tem entradas com texto de sugestão e sem a saudação", () => {
    expect(SUGGESTIONS.length).toBeGreaterThanOrEqual(5);
    expect(SUGGESTIONS.every((entry) => entry.suggestion !== "")).toBe(true);
    expect(SUGGESTIONS.some((entry) => entry.id === "ola")).toBe(false);
  });

  it("cada sugestão leva à própria resposta", () => {
    for (const entry of SUGGESTIONS) expect(findAnswer(entry.suggestion)?.id).toBe(entry.id);
  });

  it("ids não se repetem", () => {
    const ids = FAQ.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
