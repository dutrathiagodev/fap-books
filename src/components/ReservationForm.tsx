"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { CalendarDays, Info } from "lucide-react";
import { ReservationOriginBadge } from "./ReservationBadges";
import { Stepper } from "./Stepper";
import {
  addDays,
  bookTitlesSummary,
  formatDays,
  formatIsoDate,
  isIsoDate,
  MAX_BOOKS,
  MAX_DAYS,
  MAX_PURPOSE_LENGTH,
  MIN_DAYS,
  parseReservationInput,
  QUEUE_PATH,
  type ReservationFieldErrors,
} from "../domain/pedagogical/reservation-rules";
import type {
  LookupResult,
  PickableBook,
  PickableTeacher,
  ReservationSubmitPayload,
  ReservationSubmitResult,
} from "../types/pedagogical-reservation";
import { BookMultiPicker } from "./BookMultiPicker";
import { Button } from "./Button";
import { FieldError } from "./FieldError";
import { TeacherPicker } from "./TeacherPicker";
import { TextField } from "./TextField";
import { Toast } from "./Toast";

export interface ReservationFormProps {
  // "teacher": o professor pede por conta própria (cards 0090/0137). "in_person": a funcionária registra no balcão (0091/0139).
  variant: "teacher" | "in_person";
  // Hoje em Brasília (calculado no servidor, para a tela e a validação não divergirem de fuso nem de hidratação).
  today: string;
  searchBooks: (term: string) => Promise<LookupResult<PickableBook>>;
  // Só no balcão: busca do professor.
  searchTeachers?: (term: string) => Promise<LookupResult<PickableTeacher>>;
  // Server Action. Recebe a mesma chave de idempotência no clique duplo e na nova tentativa depois de falha de rede.
  submit: (payload: ReservationSubmitPayload, idempotencyKey: string) => Promise<ReservationSubmitResult>;
}

const COPY = {
  teacher: {
    title: "Nova solicitação",
    submit: "Enviar solicitação",
    sending: "Enviando…",
    success: "Solicitação enviada. Acompanhe a resposta em “Minhas reservas pedagógicas”.",
    alert: "A reserva precisa ser aprovada pela bibliotecária.",
    alertMore: "Prefere solicitar no balcão? Procure a equipe da biblioteca.",
  },
  in_person: {
    title: "Dados da solicitação",
    submit: "Registrar solicitação",
    sending: "Registrando…",
    success: "Solicitação registrada. Ela entrou na fila de aprovação como “Presencial”.",
    alert: "A solicitação entra na fila de aprovação.",
    alertMore: "A aprovação continua sendo da bibliotecária ou da chefe.",
  },
} as const;

const IN_PERSON_STEPS = ["Buscar o professor", "Escolher os livros", "Definir o prazo", "Registrar"] as const;

const NETWORK_ERROR = "Não foi possível enviar agora. Confira a conexão e tente de novo.";

// Resumo antes de enviar (Figma, card 0137): quantos livros, o período e quando devolver.
function Summary({ books, startDate, days, inPerson }: { books: PickableBook[]; startDate: string; days: number; inPerson: boolean }) {
  const valid = isIsoDate(startDate) && Number.isInteger(days) && days >= MIN_DAYS && days <= MAX_DAYS;
  if (books.length === 0 && !valid) return null;
  return (
    <aside aria-label="Resumo da solicitação" className="rounded-lg bg-subtle p-4 text-sm">
      <p className="mb-1 flex items-center gap-2 font-medium text-ink">
        <CalendarDays size={16} aria-hidden /> Resumo
      </p>
      <p className="text-ink-muted">
        {books.length === 0 ? "Nenhum livro escolhido" : `${books.length} ${books.length === 1 ? "livro" : "livros"}: ${bookTitlesSummary(books.map((book) => book.title), 3)}`}
        {valid && ` · início ${formatIsoDate(startDate)} · devolução até ${formatIsoDate(addDays(startDate, days))} (${formatDays(days)})`}
      </p>
      {inPerson && (
        <p className="mt-2 flex items-center gap-2 text-xs text-ink-muted">
          Origem na fila: <ReservationOriginBadge inPerson />
        </p>
      )}
    </aside>
  );
}

// Formulário da reserva pedagógica, o mesmo para o professor e para o balcão (o 0138 só muda quem preenche).
// A tela avisa os erros antes de enviar, mas quem decide é o servidor (e, por último, o banco).
export function ReservationForm({ variant, today, searchBooks, searchTeachers, submit }: ReservationFormProps) {
  const copy = COPY[variant];
  const [teacher, setTeacher] = useState<PickableTeacher | null>(null);
  const [books, setBooks] = useState<PickableBook[]>([]);
  const [startDate, setStartDate] = useState(today);
  const [days, setDays] = useState("7");
  const [purpose, setPurpose] = useState("");
  const [errors, setErrors] = useState<ReservationFieldErrors & { teacher?: string }>({});
  const [formError, setFormError] = useState<string>();
  const [done, setDone] = useState(false);
  // Sobe a cada limpeza do formulário: remonta os seletores, que guardam o texto digitado por conta própria.
  const [resets, setResets] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Uma chave de idempotência (uuid) por envio. Muda quando a pessoa altera qualquer campo ou depois de erro de regra.
  const key = useRef<string | null>(null);

  // Qualquer alteração é um pedido novo: descarta a chave e o aviso de sucesso anterior.
  function edit<T>(setter: (value: T) => void) {
    return (value: T) => {
      key.current = null;
      setDone(false);
      setErrors({});
      setter(value);
    };
  }

  function reset() {
    key.current = null;
    setResets((count) => count + 1);
    setTeacher(null);
    setBooks([]);
    setStartDate(today);
    setDays("7");
    setPurpose("");
    setErrors({});
    setFormError(undefined);
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setFormError(undefined);

    const parsed = parseReservationInput({ bookIds: books.map((book) => book.id), startDate, days, purpose }, today);
    const next: ReservationFieldErrors & { teacher?: string } = parsed.ok ? {} : { ...parsed.errors };
    if (variant === "in_person" && !teacher) next.teacher = "Busque e escolha o professor.";
    setErrors(next);
    if (!parsed.ok || Object.keys(next).length > 0) return;

    key.current ??= crypto.randomUUID();
    const idempotencyKey = key.current;
    const payload: ReservationSubmitPayload = {
      teacherId: teacher?.id,
      bookIds: parsed.values.bookIds,
      startDate: parsed.values.startDate,
      days: parsed.values.days,
      purpose: parsed.values.purpose ?? "",
    };

    startTransition(async () => {
      const result = await submit(payload, idempotencyKey).catch(() => null);
      if (!result) {
        setFormError(NETWORK_ERROR);
        return;
      }
      if (!result.ok) {
        if (result.final) key.current = null;
        if ("fieldErrors" in result) setErrors(result.fieldErrors);
        setFormError(result.message);
        return;
      }
      reset();
      setDone(true);
      setToast(copy.success);
    });
  }

  const daysNumber = Number(days);
  // Passo atual do registro presencial (Figma 0138): o primeiro que ainda falta; depois de registrar, todos concluídos.
  const step = done ? IN_PERSON_STEPS.length + 1 : !teacher ? 1 : books.length === 0 ? 2 : 3;

  return (
    <>
    {variant === "in_person" && <div className="mb-5"><Stepper current={step} steps={IN_PERSON_STEPS} label="Passos do registro" /></div>}
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5 rounded-lg border border-line bg-surface p-4 sm:p-6">
      <h2 className="text-h3">{copy.title}</h2>

      {variant === "in_person" && searchTeachers && (
        <TeacherPicker key={`t${resets}`} selected={teacher} onChange={edit(setTeacher)} search={searchTeachers} error={errors.teacher} disabled={pending} />
      )}

      <BookMultiPicker key={`b${resets}`} selected={books} onChange={edit(setBooks)} search={searchBooks} max={MAX_BOOKS} error={errors.books} disabled={pending} />

      <div className="grid gap-4 sm:grid-cols-3">
        <TextField
          id="reserva-inicio"
          label="Data de início do uso"
          type="date"
          required
          value={startDate}
          min={today}
          max={addDays(today, 365)}
          disabled={pending}
          error={errors.startDate}
          onChange={edit(setStartDate)}
        />
        <TextField
          id="reserva-prazo"
          label="Prazo de posse (dias)"
          type="number"
          inputMode="numeric"
          required
          value={days}
          min={MIN_DAYS}
          max={MAX_DAYS}
          hint={`Máximo de ${MAX_DAYS} dias`}
          disabled={pending}
          error={errors.days}
          onChange={edit(setDays)}
        />
        <TextField
          id="reserva-disciplina"
          label="Disciplina (opcional)"
          placeholder="Ex.: Redes I"
          maxLength={MAX_PURPOSE_LENGTH}
          value={purpose}
          disabled={pending}
          error={errors.purpose}
          onChange={edit(setPurpose)}
        />
      </div>

      <Summary books={books} startDate={startDate} days={daysNumber} inPerson={variant === "in_person"} />

      <aside className="flex items-start gap-3 rounded-lg border border-info-100 bg-info-100 p-4 text-sm text-ink dark:border-sky-400/40 dark:bg-sky-400/15">
        <Info size={18} aria-hidden className="mt-0.5 shrink-0 text-info-700 dark:text-sky-300" />
        <p>
          <strong className="font-medium">{copy.alert}</strong> {copy.alertMore}
        </p>
      </aside>

      {formError && <FieldError message={formError} />}
      {done && variant === "in_person" && (
        <p role="status" className="text-sm text-success-700 dark:text-green-300">
          Registrado.{" "}
          <Link href={QUEUE_PATH} className="font-medium underline">
            Ver na fila de aprovação
          </Link>
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-3">
        <Button text="Cancelar" variant="secondary" fullWidth={false} disabled={pending} onClick={reset} />
        <Button text={pending ? copy.sending : copy.submit} type="submit" fullWidth={false} loading={pending} />
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </form>
    </>
  );
}
