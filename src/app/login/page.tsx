import { Info, ShieldCheck } from "lucide-react";
import { LoginForm, Logo } from "@/components";

// Tela de login conforme o Figma (card 0105): painel navy com as boas-vindas e o formulário só com e-mail e senha.
// A foto de livros do topo ainda não entra: falta uma imagem própria ou com licença livre.
export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col md:grid md:grid-cols-[5fr_7fr]">
      <aside className="flex flex-col items-center gap-2 rounded-b-[28px] bg-linear-to-b from-navy-800 to-side px-6 pb-10 pt-12 text-center text-white md:items-start md:justify-between md:rounded-none md:px-12 md:py-12 md:text-left">
        <div className="flex flex-col items-center gap-2 md:items-start">
          <Logo width={150} tone="white" />
          <p className="text-sm text-navy-200">Biblioteca da Faculdade Adventista do Paraná</p>
        </div>
        <div className="hidden max-w-md flex-col gap-4 md:flex">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-navy-200">
            <ShieldCheck size={14} strokeWidth={1.5} aria-hidden />
            Portal de acesso seguro
          </span>
          <h2 className="text-h1-brand">Bem-vindo à biblioteca da FAP</h2>
          <p className="text-base text-navy-200">
            Consulte o acervo, renove empréstimos e reserve obras acadêmicas em um só lugar.
          </p>
        </div>
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
      </aside>
      <section className="flex flex-1 items-center justify-center bg-page px-6 py-10 md:px-12">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <div className="flex flex-col gap-1 text-center md:text-left">
            <h1 className="text-h3 md:text-h2">Entrar no sistema</h1>
            <p className="text-sm text-ink-muted">Use o e-mail e a senha do seu cadastro.</p>
          </div>
          <LoginForm />
          <p className="flex items-start gap-2 rounded-md bg-subtle px-4 py-3 text-sm text-ink-muted">
            <Info size={16} strokeWidth={1.5} aria-hidden className="mt-0.5 shrink-0" />
            Primeiro acesso? Use o link do convite enviado ao seu e-mail. Sem convite, procure a biblioteca.
          </p>
          <p className="flex items-start gap-2 text-xs text-ink-muted">
            <ShieldCheck size={16} strokeWidth={1.5} aria-hidden className="shrink-0 text-link" />
            Seus dados são usados só pela biblioteca e guardados por até 5 anos.
          </p>
        </div>
      </section>
    </main>
  );
}
