"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Check, ChevronDown } from "lucide-react";

interface FilterMenuProps {
  label: string;
  // Esconde o rótulo só da vista (continua para o leitor de tela): o Figma mostra o menu sem texto em cima.
  hideLabel?: boolean;
  // Texto da opção escolhida agora (aparece fechado).
  value: string;
  options: Array<{ label: string; href: string; active: boolean }>;
}

// Menu de filtro: <details> com uma lista de links. Cada opção é um endereço (guarda a pesquisa e dá para copiar), então
// funciona até sem JavaScript. O pouco de JavaScript só fecha o menu ao escolher ou ao clicar fora. Substitui o <select>
// do navegador, cuja lista aberta não segue o tema do sistema.
export function FilterMenu({ label, hideLabel = false, value, options }: FilterMenuProps) {
  const menu = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const closeOutside = (event: MouseEvent) => {
      if (menu.current && !menu.current.contains(event.target as Node)) menu.current.open = false;
    };
    document.addEventListener("click", closeOutside);
    return () => document.removeEventListener("click", closeOutside);
  }, []);

  return (
    <div className="flex flex-col gap-1 text-sm font-medium">
      <span className={hideLabel ? "sr-only" : undefined}>{label}</span>
      <details ref={menu} className="group relative">
        <summary className="flex h-11 min-w-48 cursor-pointer list-none items-center justify-between gap-3 rounded-md border border-line-strong bg-surface px-3 text-sm font-normal outline-offset-2 hover:bg-subtle focus-visible:outline-2 focus-visible:outline-focus">
          {value}
          <ChevronDown size={16} aria-hidden className="text-ink-muted transition-transform group-open:rotate-180" />
        </summary>
        <ul className="absolute left-0 z-10 mt-1 max-h-96 min-w-full overflow-auto rounded-lg border border-line bg-surface p-1 shadow-lg">
          {options.map((option) => (
            <li key={option.href}>
              <Link
                href={option.href}
                onClick={() => menu.current?.removeAttribute("open")}
                aria-current={option.active ? "true" : undefined}
                className={`flex items-center justify-between gap-4 whitespace-nowrap rounded-md px-3 py-2 text-sm font-normal hover:bg-subtle ${option.active ? "font-medium text-brand" : ""}`}
              >
                {option.label}
                {option.active && <Check size={14} aria-hidden />}
              </Link>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
