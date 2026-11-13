"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CircleHelp, MessageCircle, Send, X } from "lucide-react";
import { findAnswer, SUGGESTIONS } from "../domain/help/help-faq";
import { LIBRARY_WHATSAPP } from "../domain/library/library-info";
import { buildHelpRequestMessage, buildLibraryChatUrl } from "../domain/whatsapp/whatsapp-link";

interface ChatMessage {
  id: number;
  from: "bot" | "user";
  text: string;
  // Pergunta que o assistente não soube responder: mostra o botão para falar com a biblioteca.
  unanswered?: string;
}

const WELCOME: ChatMessage = {
  id: 0,
  from: "bot",
  text: "Olá! Sou o assistente da biblioteca. Respondo o básico (horário, prazos, multas, renovação, contato). Se eu não souber, levo você para o WhatsApp da biblioteca.",
};

const NOT_FOUND = "Não encontrei essa resposta por aqui. A equipe da biblioteca responde pelo WhatsApp:";

// Sugestões da abertura: as seis dúvidas mais comuns.
const QUICK_IDS = ["horario", "prazo", "limite", "renovacao", "multa", "contato"];
const QUICK = SUGGESTIONS.filter((entry) => QUICK_IDS.includes(entry.id));

const CHAT_LINK =
  "inline-flex h-9 items-center gap-1.5 rounded-md bg-brand px-3 text-sm font-medium text-on-brand transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

// Assistente de ajuda (balão no canto da tela): responde o básico por regras, sem IA, sem API e sem custo (src/domain/help).
// O que ele não souber vira um link para o WhatsApp da biblioteca. Nada é guardado nem enviado a servidor: a conversa some ao fechar a página.
export function HelpAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [draft, setDraft] = useState("");
  const nextId = useRef(1);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  // Ao abrir, o cursor vai para o campo de pergunta; Esc fecha e devolve o foco ao botão.
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      toggleRef.current?.focus();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Mantém a última mensagem à vista.
  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages, open]);

  function ask(question: string) {
    const text = question.trim();
    if (!text) return;
    const answer = findAnswer(text);
    const userMessage: ChatMessage = { id: nextId.current++, from: "user", text };
    const botMessage: ChatMessage = answer
      ? { id: nextId.current++, from: "bot", text: answer.answer(new Date()) }
      : { id: nextId.current++, from: "bot", text: NOT_FOUND, unanswered: text };
    setMessages((current) => [...current, userMessage, botMessage]);
    setDraft("");
  }

  return (
    <div className="print:hidden">
      {open && (
        <section
          id={panelId}
          role="dialog"
          aria-label="Assistente de ajuda da biblioteca"
          className="fixed bottom-20 right-4 z-40 flex max-h-[min(34rem,calc(100dvh-6rem))] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xl"
        >
          <header className="flex items-start justify-between gap-3 bg-brand px-4 py-3 text-on-brand">
            <div>
              <h2 className="font-heading text-base font-semibold">Ajuda da biblioteca</h2>
              <p className="text-xs opacity-90">Respostas automáticas e básicas, sem IA.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                toggleRef.current?.focus();
              }}
              aria-label="Fechar ajuda"
              className="-mr-1 grid size-8 shrink-0 cursor-pointer place-items-center rounded-md hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <X aria-hidden className="size-4" />
            </button>
          </header>

          <div ref={logRef} role="log" aria-live="polite" aria-label="Conversa" className="flex min-h-40 flex-1 flex-col gap-2 overflow-y-auto px-4 py-3">
            {messages.map((message) => (
              <div key={message.id} className={message.from === "user" ? "flex justify-end" : "flex flex-col items-start gap-2"}>
                <p
                  className={`max-w-[85%] whitespace-pre-line rounded-lg px-3 py-2 text-sm ${
                    message.from === "user" ? "bg-brand text-on-brand" : "bg-btn-soft text-ink"
                  }`}
                >
                  {message.text}
                </p>
                {message.unanswered !== undefined && (
                  <a
                    href={buildLibraryChatUrl(LIBRARY_WHATSAPP, buildHelpRequestMessage(message.unanswered))}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={CHAT_LINK}
                  >
                    <MessageCircle aria-hidden className="size-4" />
                    Falar no WhatsApp
                    <span className="sr-only"> (abre em uma nova aba)</span>
                  </a>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5 border-t border-line px-4 py-2" aria-label="Perguntas sugeridas" role="group">
            {QUICK.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => ask(entry.suggestion)}
                className="cursor-pointer rounded-full border border-line px-2.5 py-1 text-xs text-ink hover:bg-btn-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                {entry.suggestion}
              </button>
            ))}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              ask(draft);
            }}
            className="flex items-center gap-2 border-t border-line px-3 py-2.5"
          >
            <input
              ref={inputRef}
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={200}
              autoComplete="off"
              aria-label="Sua pergunta"
              placeholder="Pergunte sobre prazo, multa, horário…"
              className="h-11 min-w-0 flex-1 md:h-10 rounded-md border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
            />
            <button
              type="submit"
              disabled={draft.trim() === ""}
              aria-label="Enviar pergunta"
              className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-md bg-brand text-on-brand hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send aria-hidden className="size-4" />
            </button>
          </form>
        </section>
      )}

      <button
        ref={toggleRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={open ? "Fechar ajuda" : "Abrir ajuda"}
        className="fixed bottom-4 right-4 z-40 grid size-12 cursor-pointer place-items-center rounded-full bg-brand text-on-brand shadow-lg transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        {open ? <X aria-hidden className="size-5" /> : <CircleHelp aria-hidden className="size-6" />}
      </button>
    </div>
  );
}
