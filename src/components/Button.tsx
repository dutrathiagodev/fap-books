import type { LucideIcon } from "lucide-react";

interface ButtonProps {
  text: string;
  type?: "button" | "submit";
  disabled?: boolean;
  // Ícone depois do texto (ex.: seta de "Entrar no sistema").
  icon?: LucideIcon;
}

// Botão do FAP Books, com o azul navy da identidade visual.
export function Button({ text, type = "button", disabled = false, icon: Icon }: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className="flex w-full items-center justify-center gap-2 px-6 py-3 text-sm font-medium bg-brand text-on-brand rounded-md cursor-pointer hover:bg-brand-hover transition-colors disabled:cursor-not-allowed disabled:opacity-70"
    >
      {text}
      {Icon && <Icon size={16} strokeWidth={1.5} aria-hidden />}
    </button>
  );
}
