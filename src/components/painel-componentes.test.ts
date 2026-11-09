import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BookOpen } from "lucide-react";
import { describe, expect, it } from "vitest";
import type { DeadlineNoticeView, PendingItem } from "@/types/panel";
import { DeadlineBanner } from "./DeadlineBanner";
import { DeadlineNoticeList } from "./DeadlineNoticeList";
import { IndicatorCard } from "./IndicatorCard";
import { PanelSkeleton } from "./PanelSkeleton";
import { PendingList } from "./PendingList";
import { ShortcutBar } from "./ShortcutBar";

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);

describe("IndicatorCard", () => {
  it("mostra rótulo e número, sem link quando não há href", () => {
    const out = html(createElement(IndicatorCard, { label: "Emprestados", value: "128", icon: BookOpen }));
    expect(out).toContain("Emprestados");
    expect(out).toContain("128");
    expect(out).not.toContain("<a ");
    expect(out).not.toContain("text-danger");
  });

  it("pinta o número de vermelho no tom danger", () => {
    expect(html(createElement(IndicatorCard, { label: "Atrasados", value: "9", icon: BookOpen, tone: "danger" }))).toContain("text-danger");
  });

  it("com href vira link e leva a leitura completa para o leitor de tela", () => {
    const out = html(createElement(IndicatorCard, { label: "Atrasados", value: "9", icon: BookOpen, href: "/x", description: "9 empréstimos atrasados" }));
    expect(out).toContain('<a aria-label="9 empréstimos atrasados"');
    expect(out).toContain('href="/x"');
  });
});

describe("ShortcutBar", () => {
  it("só o primeiro atalho é primário", () => {
    const out = html(
      createElement(ShortcutBar, {
        label: "Atalhos de operação",
        shortcuts: [
          { label: "Novo empréstimo", href: "/a" },
          { label: "Registrar devolução", href: "/b" },
        ],
      }),
    );
    expect(out).toContain('aria-label="Atalhos de operação"');
    expect(out.match(/bg-brand text-on-brand/g)).toHaveLength(1);
    expect(out).toContain("bg-btn-soft");
  });
});

describe("DeadlineBanner", () => {
  it("com avisos, mostra a frase e o link para a lista", () => {
    const out = html(createElement(DeadlineBanner, { summary: { dueToday: 1, dueSoon: 2, overdue: 9 } }));
    expect(out).toContain("Atenção: 3 empréstimos vencem em até 2 dias e 9 estão atrasados.");
    expect(out).toContain('href="/funcionario/painel/avisos"');
  });

  it("sem avisos, mostra a boa notícia e nenhum link", () => {
    const out = html(createElement(DeadlineBanner, { summary: { dueToday: 0, dueSoon: 0, overdue: 0 } }));
    expect(out).toContain("Nenhum prazo próximo ou atrasado.");
    expect(out).not.toContain("<a ");
  });
});

const item: PendingItem = { key: "k", title: "Devolução de hoje", detail: "Ana · Redes", badge: "Hoje", tone: "info", actionLabel: "Ver empréstimo", href: "/e" };

describe("PendingList", () => {
  it("lista as pendências com selo e link", () => {
    const out = html(createElement(PendingList, { items: [item], moreHref: "/mais" }));
    expect(out).toContain("Pendências de hoje");
    expect(out).toContain("Devolução de hoje");
    expect(out).toContain("Hoje");
    expect(out).toContain('href="/e"');
    expect(out).toContain('href="/mais"');
  });

  it("sem itens, mostra o estado vazio do Figma", () => {
    const out = html(createElement(PendingList, { items: [] }));
    expect(out).toContain("Nenhuma pendência hoje");
    expect(out).toContain("Tudo em dia na biblioteca.");
  });
});

const notice = (over: Partial<DeadlineNoticeView>): DeadlineNoticeView => ({
  id: "n",
  status: "soon",
  userName: "Ana Souza",
  bookTitle: "Redes",
  code: "R-1",
  dueOn: "10/11/2026",
  whenLabel: "Faltam 2 dias",
  fineLabel: "Multa: R$ 0,00",
  daysLate: 0,
  fineCents: 0,
  ...over,
});

describe("DeadlineNoticeList", () => {
  it("agrupa e mostra só os grupos com itens, na ordem a vencer, hoje, atrasado", () => {
    const out = html(
      createElement(DeadlineNoticeList, {
        notices: [notice({ id: "1", status: "overdue", whenLabel: "4 dias de atraso", fineLabel: "Multa: R$ 4,00" }), notice({ id: "2" })],
      }),
    );
    expect(out.indexOf("A vencer (até 2 dias)")).toBeGreaterThan(-1);
    expect(out.indexOf("A vencer (até 2 dias)")).toBeLessThan(out.indexOf(">Atrasado<"));
    expect(out).not.toContain("Vence hoje</h2>");
    expect(out).toContain("Ver empréstimo");
    expect(out).toContain("4 dias de atraso");
    expect(out).toContain("Venceu em 10/11/2026");
  });
});

describe("PanelSkeleton", () => {
  it("avisa o leitor de tela e desenha 4 cartões", () => {
    const out = html(createElement(PanelSkeleton));
    expect(out).toContain('aria-label="Carregando o painel"');
    expect(out.match(/rounded-xl border border-line/g)).toHaveLength(4);
  });
});
