import Link from "next/link";
import { PROFILES } from "@/content/landing";
import { PRIVACY_PATH } from "@/domain/access/access-rules";
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

// Rodapé da landing (Figma, card 0195: 560 px, fundo #f4f7fb, cartões de 280×72 e navegação centralizada).
// Termos, Acessibilidade, Suporte e as redes entram quando tiverem página e endereço.
export function LandingFooter() {
  return (
    <footer className="relative bg-soft">
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

        <Link
          href={PRIVACY_PATH}
          className="text-sm text-ink-muted underline hover:text-ink focus-visible:outline-2 focus-visible:outline-focus lg:mt-[48px]"
        >
          Política de Privacidade
        </Link>
      </div>
      <div className="border-t border-line">
        <div className={`${CONTAINER} flex flex-col items-center justify-between gap-2 py-5 text-sm text-ink-muted sm:flex-row`}>
          <span>© FAP Books</span>
          <span>Faculdade Adventista do Paraná</span>
        </div>
      </div>
    </footer>
  );
}
