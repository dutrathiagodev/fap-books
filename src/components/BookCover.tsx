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
  // Capa que já aparece na primeira tela (a do detalhe, as primeiras da lista): baixa na hora e com prioridade.
  priority?: boolean;
}

// Capa do livro: a imagem do Storage ou o espaço reservado. Fica num lugar só para o <img> simples (sem o
// otimizador do Next) e o aviso do ESLint não se repetirem.
// Decisão do card 0253: não usamos o next/image. O otimizador da Vercel conta imagens de origem por mês e o plano
// gratuito tem um limite baixo (1.000), que o acervo, com uma capa por livro, pode estourar e deixar as capas sem
// carregar. As capas já são JPEG pequenos (20 a 50 KB, cache de 1 ano no Storage), então o ganho do otimizador não
// compensa o risco. Os tamanhos certos vêm de width/height (reservam o espaço e evitam salto de layout).
// loading="lazy": a capa fora da tela só baixa quando a pessoa rola até ela. Com `priority` (primeira tela), carrega na
// hora e com fetchPriority alto, que é o que melhora o LCP.
// decoding="async": decodificar a imagem não trava o resto da página. O arquivo no Storage já tem cache de 1 ano.
// Se a imagem quebrar (arquivo apagado, rede caiu), troca pelo espaço reservado em vez de mostrar o ícone de imagem
// quebrada [FAP - 0248]. Guarda o endereço que falhou: se o livro ganhar outra capa, a nova é tentada.
export function BookCover({ url, alt = "", className, width, height, fallback, priority = false }: BookCoverProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (!url || failedUrl === url) return <>{fallback}</>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      className={className}
      onError={() => setFailedUrl(url)}
    />
  );
}
