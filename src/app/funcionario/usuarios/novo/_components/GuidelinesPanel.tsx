import { Info } from "lucide-react";
import { USER_ROLE_CARDS, guidelineItems } from "@/domain/users/user-form-rules";
import type { UserRole } from "@/types/profile";

// "Diretrizes do perfil" (frame 0121): painel ao lado do formulário no computador e abaixo dele no celular.
export function GuidelinesPanel({ role }: { role: UserRole | null }) {
  return (
    <aside aria-label="Diretrizes do perfil" className="rounded-lg border border-line bg-subtle p-4 md:p-5">
      <h2 className="flex items-center gap-2 text-sm font-medium text-ink">
        <Info size={16} strokeWidth={1.5} aria-hidden className="text-brand" />
        Diretrizes do perfil
      </h2>
      {role ? (
        <>
          <p className="mt-1 text-xs text-ink-muted">{USER_ROLE_CARDS[role].title}</p>
          <dl className="mt-4 flex flex-col gap-3">
            {guidelineItems(role).map((item) => (
              <div key={item.label} className="border-t border-line pt-3 first:border-t-0 first:pt-0">
                <dt className="text-xs text-ink-muted">{item.label}</dt>
                <dd className="text-sm font-medium text-ink">{item.value}</dd>
              </div>
            ))}
          </dl>
        </>
      ) : (
        <p className="mt-2 text-sm text-ink-muted">Selecione um perfil para ver as regras.</p>
      )}
    </aside>
  );
}
