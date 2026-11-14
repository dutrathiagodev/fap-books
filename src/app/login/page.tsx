import type { Metadata } from "next";
import Link from "next/link";
import { Info, ShieldCheck } from "lucide-react";
import { PRIVACY_PATH } from "@/domain/access/access-rules";
import { AuthAside } from "@/components/AuthAside";
import { LoginForm } from "@/components";

export const metadata: Metadata = { title: "Entrar | FAP Books" };

// Tela de login conforme o Figma (cards 0105, 0219 e 0266): painel navy com foto, as boas-vindas e o formulário só com e-mail e senha.
export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col md:grid md:grid-cols-[5fr_7fr]">
      <AuthAside showStats>
        <h2 className="text-h1-brand">Bem-vindo à biblioteca da FAP</h2>
        <p className="text-base text-navy-200">
          Consulte o acervo, renove empréstimos e reserve obras acadêmicas em um só lugar.
        </p>
      </AuthAside>
      <section className="flex flex-1 items-center justify-center bg-page px-6 py-10 md:px-12">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <div className="flex flex-col gap-1 text-center md:text-left">
            <h1 className="text-h3 md:text-h2">Entrar no sistema</h1>
            <p className="text-sm text-ink-muted">Use o e-mail e a senha do seu cadastro.</p>
          </div>
          <LoginForm />
          <p className="flex items-start gap-2 rounded-md bg-subtle px-4 py-3 text-sm text-ink-muted">
            <Info size={16} strokeWidth={1.5} aria-hidden className="mt-0.5 shrink-0" />
            Primeiro acesso? Use o link do convite enviado ao seu e-mail. Esqueceu a senha? Use “Esqueci minha senha”. Sem convite, procure a biblioteca.
          </p>
          <p className="flex items-start gap-2 text-xs text-ink-muted">
            <ShieldCheck size={16} strokeWidth={1.5} aria-hidden className="shrink-0 text-link" />
            <span>
              Seus dados são usados só pela biblioteca e guardados por até 5 anos.{" "}
              <Link href={PRIVACY_PATH} className="font-medium text-link underline">
                Ler o aviso de privacidade
              </Link>
            </span>
          </p>
        </div>
      </section>
    </main>
  );
}
