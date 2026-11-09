import { describe, expect, it } from "vitest";
import type { DeadlineNoticeView, PendingPedagogicalView } from "@/types/panel";
import {
  bannerSentence,
  buildPendingItems,
  deadlineBounds,
  deadlineStatus,
  groupNotices,
  loanHref,
  noticeHref,
  parseNoticeFilter,
  toNoticeView,
  whenLabel,
} from "./panel-rules";

// Agora = 08/11/2026, 10:00 em Brasília (13:00 UTC). Prazos montados pelo horário de Brasília (UTC−3).
const NOW = new Date("2026-11-08T13:00:00Z");
const due = (isoLocal: string) => new Date(`${isoLocal}-03:00`);

describe("deadlineStatus", () => {
  it.each([
    ["2026-11-07T23:59:00", "overdue"], // ontem: já é 1 dia de atraso
    ["2026-11-01T10:00:00", "overdue"],
    ["2026-11-08T00:00:00", "today"], // hoje cedo: já passou a hora, mas devolver hoje não é atraso
    ["2026-11-08T23:59:00", "today"],
    ["2026-11-09T00:00:00", "soon"], // amanhã
    ["2026-11-10T23:59:00", "soon"], // daqui a 2 dias: último da janela
    ["2026-11-11T00:00:00", null], // daqui a 3 dias: ainda não é aviso
    ["2026-12-01T12:00:00", null],
  ])("prazo %s é %s", (iso, expected) => {
    expect(deadlineStatus(due(iso), NOW)).toBe(expected);
  });

  it("respeita uma janela maior", () => {
    expect(deadlineStatus(due("2026-11-11T12:00:00"), NOW, 3)).toBe("soon");
  });

  it("conta o dia pelo calendário de Brasília, não pelo UTC (23h de Brasília já é dia seguinte em UTC)", () => {
    const lateNight = new Date("2026-11-09T02:30:00Z"); // 08/11, 23:30 em Brasília
    expect(deadlineStatus(due("2026-11-08T12:00:00"), lateNight)).toBe("today");
    expect(deadlineStatus(due("2026-11-09T12:00:00"), lateNight)).toBe("soon");
  });
});

describe("deadlineBounds", () => {
  it("devolve os limites como instantes de meia-noite de Brasília", () => {
    expect(deadlineBounds(NOW)).toEqual({
      todayStart: "2026-11-08T03:00:00.000Z",
      tomorrowStart: "2026-11-09T03:00:00.000Z",
      windowEnd: "2026-11-11T03:00:00.000Z",
    });
  });

  it("à noite em Brasília ainda é o mesmo dia", () => {
    expect(deadlineBounds(new Date("2026-11-09T02:30:00Z")).todayStart).toBe("2026-11-08T03:00:00.000Z");
  });

  it("vira o mês", () => {
    expect(deadlineBounds(new Date("2026-11-29T15:00:00Z")).windowEnd).toBe("2026-12-02T03:00:00.000Z");
  });
});

describe("whenLabel", () => {
  it.each([
    ["soon", 2, "Faltam 2 dias"],
    ["soon", 1, "Falta 1 dia"],
    ["today", 0, "Vence hoje"],
    ["overdue", 4, "4 dias de atraso"],
    ["overdue", 1, "1 dia de atraso"],
  ] as const)("%s com %i dia(s) = %s", (status, days, text) => {
    expect(whenLabel(status, days)).toBe(text);
  });
});

describe("toNoticeView", () => {
  const row = (iso: string) => ({
    id: "l1",
    due_at: due(iso).toISOString(),
    profiles: { full_name: "João Pedro Alves", phone: "44999887766" as string | null },
    books: { title: "Banco de Dados", code: "T-0042" },
  });

  it("atrasado: dias, multa de R$ 1,00 por dia e data de vencimento", () => {
    const view = toNoticeView(row("2026-11-04T12:00:00"), NOW);
    expect(view).toMatchObject({
      status: "overdue",
      userName: "João Pedro Alves",
      bookTitle: "Banco de Dados",
      code: "T-0042",
      dueOn: "04/11/2026",
      whenLabel: "4 dias de atraso",
      fineLabel: "Multa: R$ 4,00",
      daysLate: 4,
      fineCents: 400,
    });
  });

  it("a vencer: dias que faltam e multa zerada", () => {
    expect(toNoticeView(row("2026-11-10T12:00:00"), NOW)).toMatchObject({
      status: "soon",
      whenLabel: "Faltam 2 dias",
      fineLabel: "Multa: R$ 0,00",
      daysLate: 0,
    });
  });

  it("vence hoje", () => {
    expect(toNoticeView(row("2026-11-08T08:00:00"), NOW)).toMatchObject({ status: "today", whenLabel: "Vence hoje" });
  });

  it("com telefone válido, gera o link do WhatsApp com a mensagem do aviso", () => {
    const url = toNoticeView(row("2026-11-04T12:00:00"), NOW)?.whatsappUrl ?? "";
    expect(url.startsWith("https://wa.me/5544999887766?text=")).toBe(true);
    const text = decodeURIComponent(url.split("?text=")[1]);
    expect(text).toContain("Olá, João!");
    expect(text).toContain("4 dias de atraso");
    expect(text).toContain("Multa: R$ 4,00");
  });

  it("sem telefone ou com telefone inválido, não há link", () => {
    expect(toNoticeView({ ...row("2026-11-04T12:00:00"), profiles: { full_name: "Ana", phone: null } }, NOW)?.whatsappUrl).toBeNull();
    expect(toNoticeView({ ...row("2026-11-04T12:00:00"), profiles: { full_name: "Ana", phone: "123" } }, NOW)?.whatsappUrl).toBeNull();
  });

  it("pessoa removida não gera link", () => {
    expect(toNoticeView({ ...row("2026-11-04T12:00:00"), profiles: null }, NOW)?.whatsappUrl).toBeNull();
  });

  it("prazo longe não é aviso", () => {
    expect(toNoticeView(row("2026-11-20T12:00:00"), NOW)).toBeNull();
  });

  it("nome e livro removidos viram texto neutro", () => {
    const view = toNoticeView({ id: "l2", due_at: due("2026-11-08T12:00:00").toISOString(), profiles: null, books: null }, NOW);
    expect(view).toMatchObject({ userName: "Usuário removido", bookTitle: "Livro removido", code: "—" });
  });
});

const notice = (over: Partial<DeadlineNoticeView>): DeadlineNoticeView => ({
  id: "n",
  status: "soon",
  userName: "Ana",
  bookTitle: "Redes",
  code: "R-1",
  dueOn: "10/11/2026",
  whenLabel: "Faltam 2 dias",
  fineLabel: "Multa: R$ 0,00",
  daysLate: 0,
  fineCents: 0,
  whatsappUrl: null,
  ...over,
});

describe("groupNotices", () => {
  it("separa por situação e mantém a ordem", () => {
    const groups = groupNotices([
      notice({ id: "a", status: "overdue" }),
      notice({ id: "b", status: "soon" }),
      notice({ id: "c", status: "overdue" }),
      notice({ id: "d", status: "today" }),
    ]);
    expect(groups.overdue.map((n) => n.id)).toEqual(["a", "c"]);
    expect(groups.soon.map((n) => n.id)).toEqual(["b"]);
    expect(groups.today.map((n) => n.id)).toEqual(["d"]);
  });
});

describe("filtro e endereços", () => {
  it.each([
    ["a-vencer", "soon"],
    ["hoje", "today"],
    ["atrasados", "overdue"],
    ["todos", "all"],
    ["lixo", "all"],
    [undefined, "all"],
    [["hoje", "x"], "all"],
  ])("?filtro=%s vale %s", (value, expected) => {
    expect(parseNoticeFilter(value as string | undefined)).toBe(expected);
  });

  it("monta o endereço de cada filtro e volta no mesmo valor", () => {
    expect(noticeHref()).toBe("/funcionario/painel/avisos");
    for (const filter of ["soon", "today", "overdue"] as const) {
      const param = new URL(noticeHref(filter), "http://x").searchParams.get("filtro");
      expect(parseNoticeFilter(param ?? undefined)).toBe(filter);
    }
  });

  it("o link do empréstimo busca pelo tombo, com o texto escapado", () => {
    expect(loanHref("T-0042")).toBe("/funcionario/emprestimos?aba=devolucao&q=T-0042");
    expect(loanHref("A B&c")).toBe("/funcionario/emprestimos?aba=devolucao&q=A%20B%26c");
  });
});

describe("bannerSentence", () => {
  it("frase do Figma: a vencer e atrasados", () => {
    expect(bannerSentence({ dueToday: 1, dueSoon: 2, overdue: 9 })).toBe("Atenção: 3 empréstimos vencem em até 2 dias e 9 estão atrasados.");
  });
  it("singular", () => {
    expect(bannerSentence({ dueToday: 0, dueSoon: 1, overdue: 1 })).toBe("Atenção: 1 empréstimo vence em até 2 dias e 1 está atrasado.");
  });
  it("só atrasados", () => {
    expect(bannerSentence({ dueToday: 0, dueSoon: 0, overdue: 2 })).toBe("Atenção: 2 estão atrasados.");
  });
  it("só a vencer", () => {
    expect(bannerSentence({ dueToday: 2, dueSoon: 0, overdue: 0 })).toBe("Atenção: 2 empréstimos vencem em até 2 dias.");
  });
  it("sem nada a avisar", () => {
    expect(bannerSentence({ dueToday: 0, dueSoon: 0, overdue: 0 })).toBeNull();
  });
});

describe("buildPendingItems", () => {
  const pedagogical: PendingPedagogicalView[] = [{ id: "p1", teacherName: "Carlos Eduardo Lima", bookTitles: ["Metodologia Científica", "Redes"] }];

  it("ordem do Figma: reservas, devoluções de hoje e atrasados", () => {
    const items = buildPendingItems(pedagogical, [
      notice({ id: "o", status: "overdue", daysLate: 4, fineCents: 400, userName: "João", bookTitle: "BD", code: "B-1" }),
      notice({ id: "t", status: "today", userName: "Ana", bookTitle: "Redes", code: "R-1" }),
      notice({ id: "s", status: "soon" }),
    ]);
    expect(items.map((i) => i.key)).toEqual(["pedagogical-p1", "today-t", "overdue-o"]);
    expect(items[0]).toMatchObject({
      title: "Reserva pedagógica aguardando aprovação",
      detail: "Prof. Carlos Eduardo Lima · Metodologia Científica, Redes",
      badge: "Aguardando",
      actionLabel: "Ver fila",
    });
    expect(items[1]).toMatchObject({ title: "Devolução de hoje", detail: "Ana · Redes", badge: "Hoje", href: "/funcionario/emprestimos?aba=devolucao&q=R-1" });
    expect(items[2]).toMatchObject({ title: "Atrasado há 4 dias", detail: "João · BD · multa de R$ 4,00", tone: "danger" });
  });

  it("reserva sem livros não deixa o separador solto", () => {
    expect(buildPendingItems([{ id: "p", teacherName: "Rui", bookTitles: [] }], [])[0].detail).toBe("Prof. Rui");
  });

  it("respeita o limite de linhas", () => {
    const many = Array.from({ length: 12 }, (_, i) => notice({ id: String(i), status: "overdue", daysLate: 1 }));
    expect(buildPendingItems([], many)).toHaveLength(8);
    expect(buildPendingItems([], many, 3)).toHaveLength(3);
  });

  it("sem pendências devolve lista vazia", () => {
    expect(buildPendingItems([], [notice({ status: "soon" })])).toEqual([]);
  });
});
