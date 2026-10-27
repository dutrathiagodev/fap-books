interface Crumb {
  label: string;
}

interface PageHeaderProps {
  title: string;
  breadcrumbs?: Crumb[];
  description?: string;
  // Ação principal da tela (ex.: "Novo livro"), alinhada à direita.
  action?: React.ReactNode;
}

// Cabeçalho de página do molde (Figma, card 0101): migalhas, título, subtítulo e ação principal.
export function PageHeader({ title, breadcrumbs, description, action }: PageHeaderProps) {
  return (
    <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Você está em" className="mb-2">
            <ol className="flex flex-wrap items-center gap-1 text-sm text-ink-muted">
              {breadcrumbs.map((crumb, i) => (
                <li key={crumb.label} className="flex items-center gap-1">
                  {i > 0 && <span aria-hidden>/</span>}
                  <span aria-current={i === breadcrumbs.length - 1 ? "page" : undefined}>{crumb.label}</span>
                </li>
              ))}
            </ol>
          </nav>
        )}
        <h1 className="text-h1">{title}</h1>
        {description && <p className="mt-1 text-base text-ink-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
