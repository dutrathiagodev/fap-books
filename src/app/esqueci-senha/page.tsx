import type { Metadata } from "next";
import { AuthAside } from "@/components/AuthAside";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";

export const metadata: Metadata = { title: "Esqueci minha senha | FAP Books" };

// Pedir o link para redefinir a senha (Figma, card 0266). Mesmo padrão visual do login e de /definir-senha:
// painel navy com foto e o formulário ao lado. Só abre para quem não está logado (o proxy leva quem já entrou para a própria área).
export default function EsqueciSenhaPage() {
  return (
    <main className="flex flex-1 flex-col md:grid md:grid-cols-[5fr_7fr]">
      <AuthAside>
        <h2 className="text-h1-brand">Recupere o seu acesso</h2>
        <p className="text-base text-navy-200">
          Informe o e-mail do seu cadastro e enviamos um link para você criar uma nova senha.
        </p>
      </AuthAside>
      <section className="flex flex-1 items-center justify-center bg-page px-6 py-10 md:px-12">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <ForgotPasswordForm />
        </div>
      </section>
    </main>
  );
}
