// Ícones das linhas do acervo (card 0239). Cada linha tem 4 ícones; com o componente do lucide cada um leva cerca de
// 500 bytes de marcação, o que somava ~20 KB na página. Aqui o desenho fica uma vez só num sprite (<RowIconSprite />, no
// início da tabela) e cada ícone é só um <use>. Os traçados são os mesmos do lucide (Eye, Pencil, Trash2, Archive,
// BookOpen), então o visual não muda.
const PATHS = {
  eye: (
    <>
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  pencil: (
    <>
      <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
      <path d="m15 5 4 4" />
    </>
  ),
  trash: (
    <>
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </>
  ),
  archive: (
    <>
      <rect width="20" height="5" x="2" y="3" rx="1" />
      <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
      <path d="M10 12h4" />
    </>
  ),
  book: (
    <>
      <path d="M12 5v16" />
      <path d="M20.001 19A2 2 0 0 0 22 17V5a2 2 0 0 0-1.999-2L16 3.002A5 5 0 0 0 12 5a5 5 0 0 0-4-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 1.999 2H8a5 5 0 0 1 4 2 5 5 0 0 1 4-2z" />
    </>
  ),
} as const;

export type RowIconName = keyof typeof PATHS;

// Os traços (sem preenchimento, cor do texto, linha de 2) vêm da classe .row-icon em globals.css.
export function RowIconSprite() {
  return (
    <svg aria-hidden width="0" height="0" className="absolute">
      {(Object.keys(PATHS) as RowIconName[]).map((name) => (
        <symbol key={name} id={`row-icon-${name}`} viewBox="0 0 24 24">
          {PATHS[name]}
        </symbol>
      ))}
    </svg>
  );
}

export function RowIcon({ name, size = 16 }: { name: RowIconName; size?: number }) {
  return (
    <svg aria-hidden width={size} height={size} className="row-icon">
      <use href={`#row-icon-${name}`} />
    </svg>
  );
}
