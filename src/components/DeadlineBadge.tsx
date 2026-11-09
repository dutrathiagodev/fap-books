import type { DeadlineStatus } from "../types/panel";
import { ToneBadge, type BadgeTone } from "./ToneBadge";
import { DEADLINE_LABELS } from "../domain/panel/panel-rules";

const TONES: Record<DeadlineStatus, BadgeTone> = { soon: "warning", today: "warning", overdue: "danger" };

// Selo da situação do prazo (Figma, card 0147): cor + ponto + texto ("A vencer", "Hoje", "Atrasado").
// Em vermelho, o atrasado também leva o texto: a cor nunca é a única pista.
export function DeadlineBadge({ status, tone }: { status: DeadlineStatus; tone?: BadgeTone }) {
  return (
    <ToneBadge tone={tone ?? TONES[status]}>
      <span aria-hidden>• </span>
      {DEADLINE_LABELS[status]}
    </ToneBadge>
  );
}
