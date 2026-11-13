import { LIBRARY_EMAIL, LIBRARY_WHATSAPP_LABEL, OPENING_HOURS_TEXT } from "../library/library-info";
import { FINE_PER_DAY_CENTS, formatLoanDate, formatReais, localDay } from "../loans/loan-rules";
import type { UserRole } from "@/types/profile";

// Aviso de prazo por e-mail (RF-24, cards 0236, 0062 e 0064). Regras e texto puros, sem rede nem banco:
// quem escolhe quem recebe é o banco (claim_loan_email_notices); quem envia é o serviço (loan-notices.service.ts).

export type NoticeKind = "due_soon" | "due_today" | "overdue";

export const NOTICE_KINDS: readonly NoticeKind[] = ["due_soon", "due_today", "overdue"];

// Avisa quando faltam 1 ou 2 dias para o prazo.
export const DUE_SOON_DAYS = 2;

const DAY_MS = 24 * 60 * 60 * 1000;

// Situação do empréstimo em aberto no dia de hoje, pelo calendário de Brasília. É a mesma regra do SQL
// (claim_loan_email_notices): faltam 1 a 2 dias = a vencer; é hoje = vence hoje; já passou = atrasado; mais longe = nada.
export function noticeKindFor(dueAt: Date, now: Date): NoticeKind | null {
  const daysLeft = Math.round((Date.parse(localDay(dueAt)) - Date.parse(localDay(now))) / DAY_MS);
  if (daysLeft < 0) return "overdue";
  if (daysLeft === 0) return "due_today";
  if (daysLeft <= DUE_SOON_DAYS) return "due_soon";
  return null;
}

export interface LoanNoticeInput {
  kind: NoticeKind;
  fullName: string;
  bookTitle: string;
  dueAt: Date;
  // Dias de atraso (só conta no "atrasado").
  daysLate: number;
  role: UserRole;
  // Origem do site (https://fap-books.vercel.app), já conferida por resolveSiteOrigin.
  siteOrigin: string;
}

export interface LoanNoticeEmail {
  subject: string;
  html: string;
  text: string;
}

// Área da pessoa e tela onde ela desliga os avisos.
const AREA_BY_ROLE: Record<UserRole, string> = { student: "/aluno", teacher: "/professor", librarian: "/funcionario" };
export const NOTICE_PREFERENCES_SEGMENT = "avisos";

export function noticePreferencesPath(role: UserRole): string {
  return `${AREA_BY_ROLE[role]}/${NOTICE_PREFERENCES_SEGMENT}`;
}

const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

// Título e nome vêm do cadastro: sem quebra de linha nem caractere de controle no assunto.
function oneLine(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
}

function firstName(fullName: string): string {
  return oneLine(fullName).split(" ")[0] || "";
}

function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

interface Wording {
  subject: string;
  heading: string;
  lines: string[];
}

function wordingFor(input: LoanNoticeInput): Wording {
  const title = oneLine(input.bookTitle);
  const due = formatLoanDate(input.dueAt);

  switch (input.kind) {
    case "due_soon":
      return {
        subject: `Devolução em breve: "${title}" vence em ${due}`,
        heading: "Seu livro vence em breve",
        lines: [`O prazo de devolução de "${title}" termina em ${due}.`, "Devolva na biblioteca até lá ou, se ainda precisar, renove pelo sistema."],
      };
    case "due_today":
      return {
        subject: `O livro "${title}" vence hoje`,
        heading: "Seu livro vence hoje",
        lines: [
          `O prazo de devolução de "${title}" termina hoje (${due}).`,
          "Devolva na biblioteca ainda hoje para evitar multa ou, se ainda precisar, renove pelo sistema.",
        ],
      };
    case "overdue": {
      const days = Math.max(1, input.daysLate);
      const fine = formatReais(days * FINE_PER_DAY_CENTS);
      return {
        subject: `O livro "${title}" está atrasado`,
        heading: "Seu livro está atrasado",
        lines: [
          `O prazo de devolução de "${title}" terminou em ${due}: são ${days} ${plural(days, "dia", "dias")} de atraso.`,
          `A multa é de ${formatReais(FINE_PER_DAY_CENTS)} por dia (hoje: ${fine}) e aumenta até a devolução. Devolva o livro na biblioteca o quanto antes.`,
        ],
      };
    }
  }
}

// Monta assunto, HTML (estilo em linha, como o e-mail de convite) e texto puro. Tudo que vem do cadastro é escapado.
export function buildLoanNoticeEmail(input: LoanNoticeInput): LoanNoticeEmail {
  const wording = wordingFor(input);
  const greeting = firstName(input.fullName) ? `Olá, ${firstName(input.fullName)}!` : "Olá!";
  const areaUrl = `${input.siteOrigin}${AREA_BY_ROLE[input.role]}`;
  const preferencesUrl = `${input.siteOrigin}${noticePreferencesPath(input.role)}`;
  const logoUrl = `${input.siteOrigin}/logo-modo-escuro.png`;

  const paragraphs = wording.lines
    .map((line) => `<p style="margin:0 0 16px;">${escapeHtml(line)}</p>`)
    .join("\n            ");

  const html = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef3fa;padding:32px 12px;font-family:Arial,Helvetica,sans-serif;">
  <tr>
    <td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #d6e3f5;">
        <tr>
          <td style="background:#032B5E;padding:28px 32px;text-align:center;">
            <img src="${escapeHtml(logoUrl)}" width="120" alt="FAP Books" style="display:block;margin:0 auto 14px;border:0;outline:none;height:auto;">
            <div style="font-size:13px;color:#d6e3f5;">Biblioteca da Faculdade Adventista do Paraná</div>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;color:#1a2433;font-size:16px;line-height:1.6;">
            <h1 style="margin:0 0 16px;font-size:22px;color:#032B5E;">${escapeHtml(wording.heading)}</h1>
            <p style="margin:0 0 16px;">${escapeHtml(greeting)}</p>
            ${paragraphs}
            <p style="margin:24px 0 28px;text-align:center;">
              <a href="${escapeHtml(areaUrl)}" style="display:inline-block;background:#032B5E;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 28px;border-radius:8px;">Ver meus empréstimos</a>
            </p>
            <p style="margin:0;font-size:14px;color:#4a5568;">Dúvidas? WhatsApp da biblioteca: ${escapeHtml(LIBRARY_WHATSAPP_LABEL)}. ${escapeHtml(OPENING_HOURS_TEXT)}</p>
          </td>
        </tr>
        <tr>
          <td style="background:#f5f8fc;padding:16px 32px;font-size:12px;color:#6b7280;">
            Você recebe este aviso porque tem um empréstimo na biblioteca da FAP. Para não receber mais avisos por e-mail, <a href="${escapeHtml(preferencesUrl)}" style="color:#0D3B6E;">mude a sua preferência no sistema</a>.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;

  const text = [
    greeting,
    "",
    ...wording.lines.flatMap((line) => [line, ""]),
    `Ver meus empréstimos: ${areaUrl}`,
    "",
    `Dúvidas? WhatsApp da biblioteca: ${LIBRARY_WHATSAPP_LABEL} ou ${LIBRARY_EMAIL}.`,
    OPENING_HOURS_TEXT,
    "",
    `Você recebe este aviso porque tem um empréstimo na biblioteca da FAP. Para não receber mais avisos por e-mail, mude a sua preferência: ${preferencesUrl}`,
  ].join("\n");

  return { subject: wording.subject, html, text };
}
