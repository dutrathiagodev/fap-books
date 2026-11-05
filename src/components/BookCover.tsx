import type { ReactNode } from "react";

interface BookCoverProps {
  // Endereço da capa no Storage; sem ele aparece o `fallback`.
  url?: string | null;
  alt?: string;
  // Classes da imagem: cada tela tem o tamanho que o Figma manda.
  className: string;
  width?: number;
  height?: number;
  // Espaço reservado quando o livro não tem capa (ícone, quadro...), também por tela.
  fallback: ReactNode;
}

// Capa do livro: a imagem do Storage ou o espaço reservado. Fica num lugar só para o <img> simples (sem o
// otimizador do Next) e o aviso do ESLint não se repetirem.
export function BookCover({ url, alt = "", className, width, height, fallback }: BookCoverProps) {
  if (!url) return <>{fallback}</>;
  // Capa do Storage do Supabase: imagem simples, sem passar pelo otimizador do Next.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} width={width} height={height} className={className} />;
}
