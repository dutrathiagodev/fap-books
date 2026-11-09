import { BookOpen, Banknote, BriefcaseBusiness, CalendarClock, Clock, KeyRound, TriangleAlert, type LucideIcon } from "lucide-react";
import { guidelineItems } from "@/domain/users/user-form-rules";
import type { UserRole } from "@/types/profile";

// Ícone de cada diretriz (frame 0121). Rótulo desconhecido não quebra: cai no ícone de chave.
const ICONS: Record<string, LucideIcon> = {
  "Limite de empréstimos": BookOpen,
  "Prazo regular": Clock,
  "Política de multa": Banknote,
  "Bloqueio automático": TriangleAlert,
  "Reserva pedagógica": CalendarClock,
  Acesso: KeyRound,
  Cargo: BriefcaseBusiness,
};

const REGIME: Record<UserRole, string> = { student: "Aluno", teacher: "Docente", librarian: "Equipe" };

// "Diretrizes do perfil" (frame 0121): painel branco ao lado do formulário no computador e abaixo dele no celular.
// Cada regra tem o ícone, o valor em destaque e o nome da regra por baixo.
export function GuidelinesPanel({ role }: { role: UserRole | null }) {
  return (
    <aside aria-label="Diretrizes do perfil" className="rounded-lg border border-line bg-surface p-4 shadow-sm md:p-5">
      <h2 className="text-sm font-semibold text-ink">Diretrizes do perfil</h2>
      {role ? (
        <>
          <p className="mt-2 inline-flex rounded-full bg-selected px-2 py-0.5 text-xs text-brand-ink">Regime de {REGIME[role]}</p>
          <dl className="mt-4 flex flex-col gap-3.5">
            {guidelineItems(role).map((item) => {
              const Icon = ICONS[item.label] ?? KeyRound;
              return (
                <div key={item.label} className="flex items-start gap-3">
                  <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-md bg-selected text-brand-ink">
                    <Icon size={16} strokeWidth={1.5} />
                  </span>
                  <div className="min-w-0">
                    <dt className="text-sm font-medium text-ink">{item.label}</dt>
                    <dd className="text-xs text-ink-muted">{item.value}</dd>
                  </div>
                </div>
              );
            })}
          </dl>
        </>
      ) : (
        <p className="mt-2 text-sm text-ink-muted">Selecione um perfil para ver as regras.</p>
      )}
    </aside>
  );
}
