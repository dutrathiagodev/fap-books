import Link from "next/link";
import { ChevronDown, LogIn } from "lucide-react";
import { LOGIN_PATH } from "@/domain/access/access-rules";
import { Logo } from "../Logo";
import { BUTTON_PRIMARY, BUTTON_SOFT, CONTAINER } from "./styles";

// Links da página, na ordem do Figma. Cada um aponta para o id de uma seção da landing.
const NAV_LINKS = [
  { label: "Início", href: "#inicio", active: true },
  { label: "Quem somos", href: "#quem-somos" },
  { label: "Perfis", href: "#perfis", dropdown: true },
  { label: "Recursos", href: "#recursos" },
  { label: "Acervo", href: "#acervo" },
  { label: "Novidades", href: "#novidades" },
  { label: "Contato", href: "#contato" },
];

// Cabeçalho da landing (Figma: 80 px, logo de 78×54, links em Inter Bold 15 e dois botões de 48 px).
export function LandingHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface">
      <div className={`${CONTAINER} flex h-20 items-center`}>
        <Link href="/" aria-label="FAP Books, página inicial">
          <Logo width={78} />
        </Link>

        <nav aria-label="Páginas da landing" className="ml-[102px] hidden items-center gap-[42px] xl:flex">
          {NAV_LINKS.map(({ label, href, active, dropdown }) => (
            <a
              key={href}
              href={href}
              aria-current={active ? "location" : undefined}
              className={`relative inline-flex items-center gap-2 text-[15px] font-bold leading-[18px] hover:text-link focus-visible:outline-2 focus-visible:outline-focus ${
                active ? "after:absolute after:left-0 after:top-[25px] after:h-[3px] after:w-full after:bg-brand" : ""
              }`}
            >
              {label}
              {dropdown && <ChevronDown size={8} strokeWidth={2} aria-hidden />}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <a href="#acesso" className={`${BUTTON_SOFT} max-sm:hidden`}>
            Quero acesso
          </a>
          <Link href={LOGIN_PATH} className={`${BUTTON_PRIMARY} px-8`}>
            <LogIn size={14} strokeWidth={2} aria-hidden />
            Entrar
          </Link>
        </div>
      </div>
    </header>
  );
}
