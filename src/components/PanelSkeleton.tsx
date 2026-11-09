import { Skeleton } from "./Skeleton";

// Esqueleto do painel enquanto os números carregam (Figma, card 0157): 4 cartões de indicador, os atalhos e a lista.
export function PanelSkeleton() {
  return (
    <div role="status" aria-label="Carregando o painel" className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="rounded-xl border border-line bg-surface p-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-9 w-24" />
          </div>
        ))}
      </div>
      <Skeleton className="h-11 w-full max-w-md" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-56 w-full" />
    </div>
  );
}
