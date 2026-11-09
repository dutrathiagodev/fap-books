import { STATUS_LABELS } from "../domain/pedagogical/reservation-rules";
import type { ReservationStatus } from "../types/pedagogical-reservation";
import { ToneBadge, type BadgeTone } from "./ToneBadge";

// Tom de cada situação (Figma, card 0135): Aguardando = atenção, Aprovada = sucesso, Recusada = erro.
// O texto sempre acompanha a cor, para a informação não depender só dela.
const STATUS_TONE: Record<ReservationStatus, BadgeTone> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
  returned: "info",
  cancelled: "neutral",
};

export function ReservationStatusBadge({ status }: { status: ReservationStatus }) {
  return <ToneBadge tone={STATUS_TONE[status]}>{STATUS_LABELS[status]}</ToneBadge>;
}

// Origem da solicitação na fila (Figma, card 0140): pedida pelo sistema ou registrada no balcão.
export function ReservationOriginBadge({ inPerson }: { inPerson: boolean }) {
  return <ToneBadge tone={inPerson ? "neutral" : "info"}>{inPerson ? "Presencial" : "Online"}</ToneBadge>;
}

// Tipo da solicitação: nova ou renovação de uma reserva anterior.
export function ReservationKindBadge({ renewal }: { renewal: boolean }) {
  return <ToneBadge tone={renewal ? "warning" : "success"}>{renewal ? "Renovação" : "Nova"}</ToneBadge>;
}
