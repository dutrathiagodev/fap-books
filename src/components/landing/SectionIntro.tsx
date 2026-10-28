interface SectionIntroProps {
  eyebrow?: string;
  // Parte do título que ganha a cor de destaque (como no Figma).
  accent?: string;
  title: string;
  text?: string;
  align?: "center" | "left";
  tone?: "light" | "dark";
}

// Título de seção da landing: sobretítulo pequeno, título em Lora e texto de apoio.
export function SectionIntro({ eyebrow, accent, title, text, align = "center", tone = "light" }: SectionIntroProps) {
  const dark = tone === "dark";
  return (
    <div className={`flex flex-col gap-3 ${align === "center" ? "items-center text-center" : "items-start text-left"}`}>
      {eyebrow && (
        <span className={`text-xs font-medium uppercase tracking-wide ${dark ? "text-navy-300" : "text-link"}`}>
          {eyebrow}
        </span>
      )}
      <h2 className={`font-heading text-h2 md:text-h1 ${dark ? "text-white" : "text-brand"}`}>
        {accent && <span className={dark ? "text-navy-300" : "text-link"}>{accent} </span>}
        {title}
      </h2>
      {text && <p className={`max-w-2xl text-base ${dark ? "text-navy-200" : "text-ink-muted"}`}>{text}</p>}
    </div>
  );
}
