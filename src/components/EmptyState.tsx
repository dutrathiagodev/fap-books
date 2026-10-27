import { Inbox, type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  // Ação que resolve o vazio (ex.: "Limpar filtros", "Novo livro").
  action?: React.ReactNode;
}

// Estado vazio: lista sem itens, busca sem resultado ou painel sem avisos.
export function EmptyState({ title, description, icon: Icon = Inbox, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-line bg-surface px-6 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-selected text-brand">
        <Icon size={24} aria-hidden />
      </span>
      <h2 className="text-h3">{title}</h2>
      {description && <p className="max-w-md text-base text-ink-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
