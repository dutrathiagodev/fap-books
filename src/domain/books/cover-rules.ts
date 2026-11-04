// Regras da capa (Figma, card 0117). JPG, PNG e WebP, até 2 MB, no mínimo 600×900, proporção 2:3.
// Esta lista tem de ser a mesma de allowed_mime_types do bucket book-covers. Se mudar aqui, mudar o bucket também.
// O navegador só avisa cedo. A conferência que vale é a do servidor (cover-image.ts): bytes (tipo real), tamanho e pixels,
// com o EXIF removido antes de enviar ao bucket book-covers.

export const COVER_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const COVER_MAX_BYTES = 2 * 1024 * 1024;

export const COVER_MIN_WIDTH = 600;

export const COVER_MIN_HEIGHT = 900;

// Teto das dimensões declaradas no cabeçalho: uma imagem gigante e leve (bomba de descompressão) travaria o navegador de quem abrir a capa.
export const COVER_MAX_WIDTH = 4000;

export const COVER_MAX_HEIGHT = 6000;

const COVER_RATIO = 2 / 3;

export interface CoverProbe {
  type: string;
  size: number;
  width: number;
  height: number;
}

function isCoverType(type: string): boolean {
  return (COVER_MIME_TYPES as readonly string[]).includes(type);
}

// Proporção 2:3 (mais alta do que larga), com uma folga pequena para não recusar um recorte honesto.
export function isCoverRatio(width: number, height: number): boolean {
  if (width <= 0 || height <= 0) return false;
  return Math.abs(width / height - COVER_RATIO) <= 0.02;
}

// Devolve a mensagem do erro, ou null quando a imagem pode ser a capa.
export function coverError(file: CoverProbe): string | null {
  if (!isCoverType(file.type)) return "Use uma imagem JPG, PNG ou WebP.";
  if (file.size <= 0) return "A imagem está vazia.";
  if (file.size > COVER_MAX_BYTES) return "A imagem passa de 2 MB.";
  if (file.width < COVER_MIN_WIDTH || file.height < COVER_MIN_HEIGHT) {
    return "A imagem precisa ter pelo menos 600×900 px.";
  }
  if (file.width > COVER_MAX_WIDTH || file.height > COVER_MAX_HEIGHT) {
    return "A imagem pode ter no máximo 4000×6000 px.";
  }
  if (!isCoverRatio(file.width, file.height)) return "A imagem precisa estar na proporção 2:3.";
  return null;
}
