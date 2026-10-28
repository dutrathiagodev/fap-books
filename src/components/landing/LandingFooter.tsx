import Link from "next/link";
import { PROFILES } from "@/content/landing";
import { CONTACTS } from "@/content/landing";
import { ACCESSIBILITY_PATH, PRIVACY_PATH, SUPPORT_PATH, TERMS_PATH } from "@/domain/access/access-rules";
import { Logo } from "../Logo";
import { CONTAINER } from "./styles";

// Links da navegação do rodapé: mesmas âncoras do cabeçalho.
const NAV = [
  { label: "Início", href: "#inicio" },
  { label: "Quem somos", href: "#quem-somos" },
  { label: "Recursos", href: "#recursos" },
  { label: "Acervo", href: "#acervo" },
  { label: "Novidades", href: "#novidades" },
  { label: "Contato", href: "#contato" },
];

// Redes sociais do rodapé (círculos de 32 px do Figma). Facebook e LinkedIn entram quando a biblioteca passar os endereços oficiais.
const SOCIAL = [
  { label: "Facebook", text: "f", href: null as string | null },
  { label: "LinkedIn", text: "in", href: null as string | null },
  { label: "Instagram", text: "ig", href: CONTACTS.find(({ label }) => label === "Instagram")?.href ?? null },
].filter((network): network is { label: string; text: string; href: string } => network.href !== null);

const LEGAL = [
  { label: "Termos e Condições", href: TERMS_PATH },
  { label: "Política de Privacidade", href: PRIVACY_PATH },
  { label: "Acessibilidade", href: ACCESSIBILITY_PATH },
  { label: "Suporte", href: SUPPORT_PATH },
];

// Rodapé da landing (Figma, card 0195: 560 px, fundo #f4f7fb, cartões de 280×72 e navegação centralizada).
export function LandingFooter() {
  return (
    <footer className="relative bg-foot">
      <span aria-hidden className="absolute left-1/2 top-0 hidden h-[95px] w-[190px] -translate-x-1/2 rounded-b-full bg-page lg:block" />
      <div className={`${CONTAINER} flex flex-col items-center gap-10 py-14 lg:min-h-[500px] lg:gap-0 lg:pt-[90px]`}>
        <div className="flex items-center gap-6">
          <Logo width={108} />
          <span aria-hidden className="h-14 w-px bg-line" />
          <span className="text-[15px] font-bold">Faculdade Adventista do Paraná</span>
        </div>

        <nav aria-label="Rodapé" className="flex flex-wrap justify-center gap-x-9 gap-y-3 text-base font-bold lg:mt-[56px]">
          {NAV.map(({ label, href }) => (
            <a key={href} href={href} className="hover:text-link focus-visible:outline-2 focus-visible:outline-focus">
              {label}
            </a>
          ))}
        </nav>

        <ul className="grid w-full max-w-[880px] gap-5 sm:grid-cols-3 lg:mt-[36px]">
          {PROFILES.map((profile) => (
            <li key={profile.title} className="flex h-[72px] flex-col justify-center rounded-lg border border-line bg-surface px-5">
              <span className="block text-[10px] font-bold uppercase leading-3 text-link">{profile.eyebrow}</span>
              <span className="block text-lg font-bold leading-6">{profile.title}</span>
            </li>
          ))}
        </ul>

        <div className="mt-2 flex w-full flex-col items-center gap-6 sm:flex-row sm:justify-between lg:mt-[48px] lg:px-[58px]">
          <ul className="flex gap-3">
            {SOCIAL.map(({ label, text, href }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex size-8 items-center justify-center rounded-full border border-line bg-surface text-[11px] font-bold hover:text-link focus-visible:outline-2 focus-visible:outline-focus"
                >
                  {text}
                </a>
              </li>
            ))}
          </ul>
          <nav aria-label="Informações legais" className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
            {LEGAL.map(({ label, href }) => (
              <Link key={href} href={href} className="hover:text-link focus-visible:outline-2 focus-visible:outline-focus">
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      <div className="border-t border-line bg-surface">
        <div className={`${CONTAINER} flex flex-col items-center justify-between gap-2 py-5 text-sm text-ink-muted sm:flex-row`}>
          <span>© FAP Books</span>
          <span>Faculdade Adventista do Paraná</span>
        </div>
      </div>
    </footer>
  );
}
