import Image from "next/image";
import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { Logo } from "./Logo";

// Painel navy com foto das telas de acesso (login, convite/redefinição de senha e "Esqueci minha senha"; Figma, cards 0105 e 0266).
// Fotos em public/fotos: biblioteca da FAP (desktop, uso autorizado pela FAP) e estante do Unsplash (celular, licença livre).
// children: o título e o texto de boas-vindas (só aparecem no computador). showStats: os números da biblioteca (só no login).
export function AuthAside({ children, showStats = false }: { children: ReactNode; showStats?: boolean }) {
  return (
    <aside className="relative isolate flex flex-col items-center gap-2 overflow-hidden rounded-b-[28px] bg-linear-to-b from-navy-800 to-side px-6 pb-10 pt-12 text-center text-white md:items-start md:justify-between md:rounded-none md:px-12 md:py-12 md:text-left">
      <Image
        src="/fotos/login-celular-topo.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-10 object-cover opacity-50 md:hidden"
      />
      <Image
        src="/fotos/login-biblioteca.jpg"
        alt=""
        fill
        priority
        sizes="(min-width: 768px) 42vw, 0px"
        className="-z-10 hidden object-cover opacity-20 md:block"
      />
      <div className="flex flex-col items-center gap-2 md:items-start">
        <Logo width={150} tone="white" />
        <p className="text-sm text-navy-200">Biblioteca da Faculdade Adventista do Paraná</p>
      </div>
      <div className="hidden max-w-md flex-col gap-4 md:flex">
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-navy-200">
          <ShieldCheck size={14} strokeWidth={1.5} aria-hidden />
          Portal de acesso seguro
        </span>
        {children}
      </div>
      {showStats ? (
        <ul className="hidden gap-3 md:flex">
          <li className="rounded-lg bg-white/10 px-4 py-3">
            <span className="block font-heading text-h3">7 dias</span>
            <span className="text-xs text-navy-200">de empréstimo</span>
          </li>
          <li className="rounded-lg bg-white/10 px-4 py-3">
            <span className="block font-heading text-h3">3 livros</span>
            <span className="text-xs text-navy-200">por aluno</span>
          </li>
        </ul>
      ) : (
        <span aria-hidden className="hidden md:block" />
      )}
    </aside>
  );
}
