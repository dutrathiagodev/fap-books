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
// loading="lazy": a capa fora da tela só baixa quando a pessoa rola até ela (a que já está visível carrega na hora).
// decoding="async": decodificar a imagem não trava o resto da página. O arquivo no Storage já tem cache de 1 ano.
export function BookCover({ url, alt = "", className, width, height, fallback }: BookCoverProps) {
  if (!url) return <>{fallback}</>;
  // Capa do Storage do Supabase: imagem simples, sem passar pelo otimizador do Next.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} width={width} height={height} loading="lazy" decoding="async" className={className} />;
}
