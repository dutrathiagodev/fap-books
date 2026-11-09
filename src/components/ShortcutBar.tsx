import type { LucideIcon } from "lucide-react";
import { Button } from "./Button";

export interface Shortcut {
  label: string;
  href: string;
  icon?: LucideIcon;
}

export interface ShortcutBarProps {
  // Nome do grupo para o leitor de tela (ex.: "Atalhos de operação").
  label: string;
  // O primeiro atalho é o único botão primário da área (navy); os outros são secundários.
  shortcuts: Shortcut[];
}

// Atalhos de operação do painel (Figma, card 0157): linha de botões no computador e coluna de largura total no celular.
export function ShortcutBar({ label, shortcuts }: ShortcutBarProps) {
  return (
    <nav aria-label={label} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      {shortcuts.map((shortcut, index) => (
        <Button
          key={shortcut.href}
          text={shortcut.label}
          href={shortcut.href}
          icon={shortcut.icon}
          variant={index === 0 ? "primary" : "secondary"}
          size="default"
          fullWidth={false}
        />
      ))}
    </nav>
  );
}
