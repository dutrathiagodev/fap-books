interface SkeletonProps {
  // Tamanho e forma vêm das classes (ex.: "h-4 w-40", "h-32 w-full").
  className?: string;
}

// Bloco cinza pulsante que ocupa o lugar do conteúdo enquanto ele carrega.
export function Skeleton({ className = "h-4 w-full" }: SkeletonProps) {
  return <div aria-hidden className={`animate-pulse rounded-md bg-selected motion-reduce:animate-none ${className}`} />;
}
