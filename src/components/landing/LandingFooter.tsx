import Link from "next/link";
import { PRIVACY_PATH } from "@/domain/access/access-rules";
import { Logo } from "../Logo";

// Atalhos por perfil: ligam a seção "Perfis" quando ela existir.
const PROFILES = [
  { eyebrow: "Para", title: "Alunos" },
  { eyebrow: "Para", title: "Professores" },
  { eyebrow: "Para a", title: "Equipe da biblioteca" },
];

// Rodapé da landing (Figma, card 0195). Termos, Acessibilidade, Suporte e as redes entram quando tiverem página e endereço.
export function LandingFooter() {
  return (
    <footer id="contato" className="border-t border-line bg-subtle">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center gap-10 px-4 py-14 md:px-8">
        <div className="flex items-center gap-4">
          <Logo width={96} />
          <span aria-hidden className="h-10 w-px bg-line-strong" />
          <span className="text-sm font-semibold">Faculdade Adventista do Paraná</span>
        </div>

        <ul className="grid w-full max-w-3xl gap-4 sm:grid-cols-3">
          {PROFILES.map((profile) => (
            <li key={profile.title} className="rounded-lg border border-line bg-surface px-5 py-4">
              <span className="block text-xs font-medium uppercase tracking-wide text-link">{profile.eyebrow}</span>
              <span className="block font-heading text-h3">{profile.title}</span>
            </li>
          ))}
        </ul>

        <nav aria-label="Informações legais" className="flex flex-wrap justify-center gap-6 text-sm text-ink-muted">
          <Link href={PRIVACY_PATH} className="underline hover:text-ink focus-visible:outline-2 focus-visible:outline-focus">
            Política de Privacidade
          </Link>
        </nav>
      </div>

      <div className="border-t border-line bg-surface">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center justify-between gap-2 px-4 py-5 text-sm text-ink-muted sm:flex-row md:px-8">
          <span>© FAP Books</span>
          <span>Faculdade Adventista do Paraná</span>
        </div>
      </div>
    </footer>
  );
}
