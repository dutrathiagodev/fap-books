import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  label?: string;
}

// Estado de carregamento: o leitor de tela anuncia o texto, e o giro some para quem pediu menos movimento.
export function LoadingState({ label = "Carregando..." }: LoadingStateProps) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 px-6 py-12 text-ink-muted">
      <Loader2 size={20} aria-hidden className="animate-spin motion-reduce:animate-none" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}
