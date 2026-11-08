"use client";

import { Check, GraduationCap, IdCard, Presentation, type LucideIcon } from "lucide-react";
import { USER_ROLES, USER_ROLE_CARDS } from "@/domain/users/user-form-rules";
import type { UserRole } from "@/types/profile";

interface ProfileSelectorProps {
  value: UserRole | "";
  onChange: (role: UserRole) => void;
  disabled?: boolean;
  error?: string;
}

const ICONS: Record<UserRole, LucideIcon> = { student: GraduationCap, teacher: Presentation, librarian: IdCard };

// Seletor de perfil (card 0122): três cartões com ícone, nome e subtítulo, e o marcador de selecionado.
// É um grupo de rádios, então funciona por teclado e leitor de tela.
export function ProfileSelector({ value, onChange, disabled = false, error }: ProfileSelectorProps) {
  return (
    <fieldset disabled={disabled} className="min-w-0 border-0 p-0">
      <legend className="mb-2 text-sm leading-6 font-medium text-ink">
        Perfil do usuário <span aria-hidden>*</span>
      </legend>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {USER_ROLES.map((role) => {
          const Icon = ICONS[role];
          const card = USER_ROLE_CARDS[role];
          const selected = value === role;
          return (
            <label
              key={role}
              className={`relative flex cursor-pointer items-center gap-3 rounded-lg border p-4 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 ${
                selected ? "border-brand bg-selected" : "border-line bg-surface hover:bg-subtle"
              }`}
            >
              <input
                type="radio"
                name="role"
                value={role}
                checked={selected}
                onChange={() => onChange(role)}
                className="sr-only"
              />
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-subtle text-brand">
                <Icon size={20} strokeWidth={1.5} aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-ink">{card.title}</span>
                <span className="block text-xs text-ink-muted">{card.subtitle}</span>
              </span>
              {selected && (
                <span className="ml-auto flex size-5 shrink-0 items-center justify-center rounded-full bg-brand text-on-brand">
                  <Check size={12} strokeWidth={2} aria-hidden />
                  <span className="sr-only">Selecionado</span>
                </span>
              )}
            </label>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-danger-700">
          {error}
        </p>
      )}
    </fieldset>
  );
}
