// Dados do frame Fundamentos do Figma (card 0099). Os hex da paleta têm de bater com src/app/globals.css: o teste ao lado confere.

export interface ColorSwatch {
  name: string;
  hex: string;
}

export interface ColorGroup {
  name: string;
  swatches: ColorSwatch[];
}

export interface TypeStyle {
  name: string;
  // Tamanho e altura de linha, como no frame ("48/56").
  spec: string;
  sample: string;
  className: string;
}

export interface SpaceToken {
  name: string;
  px: number;
}

export interface RadiusToken {
  name: string;
  px: number;
  className: string;
}

export interface ShadowToken {
  name: string;
  className: string;
}

export const SAMPLE = "Biblioteca da FAP para alunos, professores e bibliotecários";

export const COLORS: ColorGroup[] = [
  {
    name: "navy",
    swatches: [
      { name: "50", hex: "#EFF4FA" },
      { name: "100", hex: "#DFE9F6" },
      { name: "200", hex: "#C0D3ED" },
      { name: "300", hex: "#90B3DF" },
      { name: "400", hex: "#598DCF" },
      { name: "500", hex: "#3075CF" },
      { name: "600", hex: "#215DAB" },
      { name: "700", hex: "#154A8E" },
      { name: "800", hex: "#0D3B6E" },
      { name: "900", hex: "#032B5E" },
      { name: "950", hex: "#031730" },
    ],
  },
  {
    name: "gray",
    swatches: [
      { name: "500", hex: "#8C8C8C" },
      { name: "600", hex: "#6B6B6B" },
    ],
  },
  {
    name: "white",
    swatches: [{ name: "white", hex: "#FFFFFF" }],
  },
  {
    name: "success",
    swatches: [
      { name: "100", hex: "#DCFCE7" },
      { name: "700", hex: "#15803D" },
    ],
  },
  {
    name: "warning",
    swatches: [
      { name: "100", hex: "#FEF3C7" },
      { name: "700", hex: "#B45309" },
    ],
  },
  {
    name: "danger",
    swatches: [
      { name: "100", hex: "#FEE2E2" },
      { name: "700", hex: "#B91C1C" },
    ],
  },
  {
    name: "info",
    swatches: [
      { name: "100", hex: "#E0F2FE" },
      { name: "700", hex: "#0369A1" },
    ],
  },
  {
    name: "bg",
    swatches: [
      { name: "page", hex: "#FFFFFF" },
      { name: "surface", hex: "#FFFFFF" },
      { name: "subtle", hex: "#EFF4FA" },
      { name: "selected", hex: "#DFE9F6" },
      { name: "brand", hex: "#032B5E" },
      { name: "brand-hover", hex: "#154A8E" },
    ],
  },
  {
    name: "text",
    swatches: [
      { name: "primary", hex: "#031730" },
      { name: "secondary", hex: "#6B6B6B" },
      { name: "on-brand", hex: "#FFFFFF" },
      { name: "link", hex: "#3075CF" },
    ],
  },
  {
    name: "border",
    swatches: [
      { name: "default", hex: "#C0D3ED" },
      { name: "strong", hex: "#8C8C8C" },
      { name: "focus", hex: "#3075CF" },
    ],
  },
  {
    name: "state",
    swatches: [
      { name: "success/text", hex: "#15803D" },
      { name: "success/bg", hex: "#DCFCE7" },
      { name: "warning/text", hex: "#B45309" },
      { name: "warning/bg", hex: "#FEF3C7" },
      { name: "danger/text", hex: "#B91C1C" },
      { name: "danger/bg", hex: "#FEE2E2" },
      { name: "info/text", hex: "#0369A1" },
      { name: "info/bg", hex: "#E0F2FE" },
    ],
  },
];

export const TYPE_STYLES: TypeStyle[] = [
  { name: "Título/H1 Marca", spec: "48/56", sample: SAMPLE, className: "font-heading text-[1.75rem] leading-9 font-semibold md:text-h1-brand md:leading-[3.5rem]" },
  { name: "Título/H1 Página", spec: "36/44", sample: SAMPLE, className: "font-heading text-2xl leading-8 font-semibold md:text-h1 md:leading-[2.75rem]" },
  { name: "Título/H2", spec: "28/36", sample: SAMPLE, className: "font-heading text-h3 font-semibold md:text-h2" },
  { name: "Título/H3", spec: "22/30", sample: SAMPLE, className: "font-heading text-lg leading-7 font-semibold md:text-h3" },
  { name: "Texto/Corpo", spec: "16/24", sample: SAMPLE, className: "text-base leading-6" },
  { name: "Texto/Corpo Médio", spec: "16/24", sample: SAMPLE, className: "text-base leading-6 font-medium" },
  { name: "Texto/Menu e Botão", spec: "14/20", sample: SAMPLE, className: "text-sm leading-5 font-medium" },
  { name: "Texto/Pequeno", spec: "14/20", sample: SAMPLE, className: "text-sm leading-5" },
  { name: "Texto/Legenda", spec: "12/16", sample: SAMPLE, className: "text-xs leading-4" },
];

export const SPACES: SpaceToken[] = [
  { name: "spacing/1", px: 4 },
  { name: "spacing/2", px: 8 },
  { name: "spacing/3", px: 12 },
  { name: "spacing/4", px: 16 },
  { name: "spacing/6", px: 24 },
  { name: "spacing/8", px: 32 },
  { name: "spacing/12", px: 48 },
  { name: "spacing/16", px: 64 },
];

export const RADII: RadiusToken[] = [
  { name: "radius/sm", px: 4, className: "rounded-sm" },
  { name: "radius/md", px: 8, className: "rounded-md" },
  { name: "radius/lg", px: 12, className: "rounded-lg" },
  { name: "radius/full", px: 9999, className: "rounded-full" },
];

export const SHADOWS: ShadowToken[] = [
  { name: "Sombra/Pequena", className: "shadow-sm" },
  { name: "Sombra/Média", className: "shadow-md" },
  { name: "Sombra/Grande", className: "shadow-lg" },
];

// Seção "Grade e telas" do frame Fundamentos, linha a linha.
export const GRID_NOTES: string[] = [
  "Grade de 4 px: espaços, tamanhos e raios são múltiplos de 4.",
  "Telas: desktop 1280 (prioridade), tablet 768 e celular 375.",
  "Ícones: Lucide, 16, 20 ou 24 px, traço 1,5.",
  "Estado = cor + ícone + texto. Verde sucesso, amarelo atenção, vermelho erro e azul informação.",
  "Um único botão primário navy por área. Texto secundário #6B6B6B, nunca #8C8C8C.",
];
