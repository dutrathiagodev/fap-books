"use client";

import { useState } from "react";
import type { ReactNode } from "react";

interface BookCoverProps {
  // Endereço da capa no Storage; sem ele (ou se a imagem não carregar) aparece o `fallback`.
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
// Se a imagem quebrar (arquivo apagado, rede caiu), troca pelo espaço reservado em vez de mostrar o ícone de imagem
// quebrada [FAP - 0248]. Guarda o endereço que falhou: se o livro ganhar outra capa, a nova é tentada.
export function BookCover({ url, alt = "", className, width, height, fallback }: BookCoverProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (!url || failedUrl === url) return <>{fallback}</>;
  // Capa do Storage do Supabase: imagem simples, sem passar pelo otimizador do Next.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      className={className}
      onError={() => setFailedUrl(url)}
    />
  );
}
