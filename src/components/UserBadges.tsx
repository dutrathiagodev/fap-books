import { CircleCheck, CircleOff } from "lucide-react";
import type { UserRole } from "../types/profile";
import { ToneBadge, type BadgeTone } from "./ToneBadge";

// Cada perfil tem a sua cor, e a leitura nunca depende só dela: o texto sempre aparece (Figma, card 0126).
const ROLE_TONE: Record<UserRole, BadgeTone> = { student: "info", teacher: "warning", librarian: "neutral" };

export function UserRoleBadge({ role, label }: { role: UserRole; label: string }) {
  return <ToneBadge tone={ROLE_TONE[role]}>{label}</ToneBadge>;
}

const STATUS = {
  active: {
    label: "Ativo",
    icon: CircleCheck,
    className: "bg-success-100 text-success-700 dark:bg-green-400/15 dark:text-green-300 dark:ring-1 dark:ring-inset dark:ring-green-400/40",
  },
  inactive: { label: "Inativo", icon: CircleOff, className: "bg-subtle text-ink-muted" },
} as const;

// Situação do usuário: Ativo (verde) ou Inativo (cinza), sempre com ícone, para a informação não depender só da cor.
export function UserStatusBadge({ active }: { active: boolean }) {
  const { label, icon: Icon, className } = STATUS[active ? "active" : "inactive"];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${className}`}>
      <Icon size={12} strokeWidth={2} aria-hidden />
      {label}
    </span>
  );
}
