import Link from "next/link";
import { LogIn } from "lucide-react";
import { LOGIN_PATH } from "@/domain/access/access-rules";
import { Logo } from "../Logo";

// Links da página, na ordem do Figma. Cada um aponta para o id de uma seção da landing.
const NAV_LINKS = [
  { label: "Início", href: "#inicio" },
  { label: "Quem somos", href: "#quem-somos" },
  { label: "Perfis", href: "#perfis" },
  { label: "Recursos", href: "#recursos" },
  { label: "Acervo", href: "#acervo" },
  { label: "Novidades", href: "#novidades" },
  { label: "Contato", href: "#contato" },
];
// Cabeçalho da landing: logo, links da página e os botões de acesso.
export function LandingHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-[72px] w-full max-w-[1200px] items-center justify-between gap-6 px-4 md:px-8">
        <Link href="/" aria-label="FAP Books, página inicial">
          <Logo width={84} />
        </Link>

        <nav aria-label="Páginas da landing" className="hidden items-center gap-5 lg:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium hover:text-link focus-visible:outline-2 focus-visible:outline-focus"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="#acesso"
            className="hidden rounded-md bg-selected px-4 py-2.5 text-sm font-medium text-brand hover:bg-navy-100 focus-visible:outline-2 focus-visible:outline-focus sm:inline-flex"
          >
            Quero acesso
          </a>
          <Link
            href={LOGIN_PATH}
            className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-on-brand hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-focus"
          >
            <LogIn size={16} strokeWidth={1.5} aria-hidden />
            Entrar
          </Link>
        </div>
      </div>
    </header>
  );
}
