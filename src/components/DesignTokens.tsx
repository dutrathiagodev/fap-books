import { CircleAlert } from "lucide-react";
import {
  COLORS,
  GRID_NOTES,
  RADII,
  SHADOWS,
  SPACES,
  TYPE_STYLES,
  type ColorGroup,
  type RadiusToken,
  type ShadowToken,
  type SpaceToken,
  type TypeStyle,
} from "@/domain/design/tokens";

export interface DesignTokensProps {
  title?: string;
  description?: string;
  colors?: ColorGroup[];
  typeStyles?: TypeStyle[];
  spaces?: SpaceToken[];
  radii?: RadiusToken[];
  shadows?: ShadowToken[];
  gridNotes?: string[];
  error?: string;
}

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
  gridNotes = GRID_NOTES,
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
          <GridSection notes={gridNotes} />
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
                      <span className="block text-xs uppercase text-ink-muted">{swatch.hex}</span>
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
              <span className="block text-xs text-ink-muted">{radius.px === 9999 ? "pílula" : `${radius.px} px`}</span>
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

function GridSection({ notes }: { notes: string[] }) {
  return (
    <div>
      <SectionTitle>Grade e telas</SectionTitle>
      {notes.length === 0 ? (
        <EmptyNote />
      ) : (
        <ul className="mt-4 flex flex-col gap-2 text-base">
          {notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
