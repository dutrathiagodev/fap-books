import { CircleAlert } from "lucide-react";

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

export interface DesignTokensProps {
  title?: string;
  description?: string;
  colors?: ColorGroup[];
  typeStyles?: TypeStyle[];
  spaces?: SpaceToken[];
  radii?: RadiusToken[];
  shadows?: ShadowToken[];
  error?: string;
}

const SAMPLE = "Biblioteca da FAP para alunos, professores e bibliotecários";

const COLORS: ColorGroup[] = [
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

const TYPE_STYLES: TypeStyle[] = [
  { name: "Título/H1 Marca", spec: "48/56", sample: SAMPLE, className: "font-heading text-[1.75rem] leading-9 font-semibold md:text-h1-brand md:leading-[3.5rem]" },
  { name: "Título/H1 Página", spec: "36/44", sample: SAMPLE, className: "font-heading text-2xl leading-8 font-semibold md:text-h1 md:leading-[2.75rem]" },
  { name: "Título/H2", spec: "28/36", sample: SAMPLE, className: "font-heading text-h3 font-semibold md:text-h2" },
  { name: "Título/H3", spec: "22/30", sample: SAMPLE, className: "font-heading text-lg leading-7 font-semibold md:text-h3" },
  { name: "Texto/Corpo", spec: "16/24", sample: SAMPLE, className: "text-base leading-6" },
  { name: "Texto/Menu e Botão", spec: "14/20", sample: SAMPLE, className: "text-sm leading-5 font-medium" },
  { name: "Texto/Pequeno", spec: "14/20", sample: SAMPLE, className: "text-sm leading-5" },
  { name: "Texto/Legenda", spec: "12/16", sample: SAMPLE, className: "text-xs leading-4" },
];

const SPACES: SpaceToken[] = [
  { name: "spacing/1", px: 4 },
  { name: "spacing/2", px: 8 },
  { name: "spacing/3", px: 12 },
  { name: "spacing/4", px: 16 },
  { name: "spacing/6", px: 24 },
  { name: "spacing/8", px: 32 },
  { name: "spacing/12", px: 48 },
  { name: "spacing/16", px: 64 },
];

const RADII: RadiusToken[] = [
  { name: "radius/sm", px: 4, className: "rounded-sm" },
  { name: "radius/md", px: 8, className: "rounded-md" },
  { name: "radius/lg", px: 12, className: "rounded-lg" },
  { name: "radius/full", px: 9999, className: "rounded-full" },
];

const SHADOWS: ShadowToken[] = [
  { name: "Sombra/Pequena", className: "shadow-sm" },
  { name: "Sombra/Média", className: "shadow-md" },
  { name: "Sombra/Grande", className: "shadow-lg" },
];

// Fundamentos do design system (Figma, card 0099, frame Fundamentos).
// Só desenha: a página pode trocar a lista, esvaziá-la ou informar um erro.
export function DesignTokens({
  title = "Fundamentos do design system",
  description = "Cores, textos, espaçamento, raios, sombras e grade do FAP Books. Tudo vem das variáveis e estilos do arquivo: use estes nomes, nunca valores soltos.",
  colors = COLORS,
  typeStyles = TYPE_STYLES,
  spaces = SPACES,
  radii = RADII,
  shadows = SHADOWS,
  error,
}: DesignTokensProps) {
  return (
    <section className="rounded-lg border border-line bg-surface p-4 text-ink md:p-6">
      <h2 className="font-heading text-2xl leading-8 font-semibold text-brand md:text-h1 md:leading-[2.75rem]">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm text-ink-muted">{description}</p>
      {error ? (
        <p role="alert" className="mt-6 flex items-center gap-2 rounded-md border border-danger-700 bg-danger-100 px-3 py-2 text-sm text-danger-700">
          <CircleAlert size={16} strokeWidth={1.5} aria-hidden />
          {error}
        </p>
      ) : (
        <div className="mt-8 flex flex-col gap-10">
          <ColorSection groups={colors} />
          <TypeSection styles={typeStyles} />
          <SpaceSection spaces={spaces} />
          <RadiusSection radii={radii} />
          <ShadowSection shadows={shadows} />
        </div>
      )}
    </section>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <h3 className="font-heading text-h3 font-semibold text-brand">{children}</h3>;
}

function EmptyNote() {
  return <p className="mt-3 text-sm text-ink-muted">Nenhum token nesta seção.</p>;
}

function ColorSection({ groups }: { groups: ColorGroup[] }) {
  return (
    <div>
      <SectionTitle>Cores</SectionTitle>
      {groups.length === 0 ? (
        <EmptyNote />
      ) : (
        <div className="mt-4 flex flex-col gap-5">
          {groups.map((group) => (
            <div key={group.name}>
              <p className="text-sm font-medium">{group.name}</p>
              {group.swatches.length === 0 ? (
                <EmptyNote />
              ) : (
                <ul className="mt-2 flex flex-wrap gap-3">
                  {group.swatches.map((swatch) => (
                    <li key={swatch.name} className="w-14">
                      <span className="block h-12 w-full rounded-md border border-line" style={{ backgroundColor: swatch.hex }} />
                      <span className="mt-1 block text-xs">{swatch.name}</span>
                      <span className="block text-[10px] uppercase text-ink-muted">{swatch.hex}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TypeSection({ styles }: { styles: TypeStyle[] }) {
  return (
    <div>
      <SectionTitle>Textos (Lora nos títulos, Inter no resto)</SectionTitle>
      {styles.length === 0 ? (
        <EmptyNote />
      ) : (
        <ul className="mt-4 flex flex-col gap-4">
          {styles.map((style) => (
            <li key={style.name} className="grid items-baseline gap-1 md:grid-cols-[11rem_1fr] md:gap-6">
              <p className="text-xs text-ink-muted">
                {style.name} · {style.spec}
              </p>
              <p className={style.className}>{style.sample}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SpaceSection({ spaces }: { spaces: SpaceToken[] }) {
  return (
    <div>
      <SectionTitle>Espaçamento (grade de 4 px)</SectionTitle>
      {spaces.length === 0 ? (
        <EmptyNote />
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {spaces.map((space) => (
            <li key={space.name} className="grid items-center gap-2 md:grid-cols-[11rem_1fr] md:gap-6">
              <p className="text-xs text-ink-muted">
                {space.name} · {space.px} px
              </p>
              <span className="h-3 max-w-full rounded-sm bg-brand" style={{ width: space.px }} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RadiusSection({ radii }: { radii: RadiusToken[] }) {
  return (
    <div>
      <SectionTitle>Raios (8 px em botões e campos, 12 px em cards e modais)</SectionTitle>
      {radii.length === 0 ? (
        <EmptyNote />
      ) : (
        <ul className="mt-4 flex flex-wrap gap-4">
          {radii.map((radius) => (
            <li key={radius.name} className="w-24">
              <span className={`block h-16 w-full border border-line bg-subtle ${radius.className}`} />
              <span className="mt-1 block text-xs">{radius.name}</span>
              <span className="block text-[10px] text-ink-muted">{radius.px === 9999 ? "pílula" : `${radius.px} px`}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ShadowSection({ shadows }: { shadows: ShadowToken[] }) {
  return (
    <div>
      <SectionTitle>Sombras</SectionTitle>
      {shadows.length === 0 ? (
        <EmptyNote />
      ) : (
        <ul className="mt-4 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
          {shadows.map((shadow) => (
            <li key={shadow.name} className={`w-full rounded-lg border border-line bg-surface p-4 sm:w-40 ${shadow.className}`}>
              <p className="text-sm font-medium">{shadow.name}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
