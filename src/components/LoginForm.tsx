"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { Button } from "./Button";

// Formulário de login. O proxy.ts leva a pessoa para a área do perfil dela depois de entrar.
export function LoginForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // O Next guarda a tela de login escondida quando a pessoa entra. Ao sair e voltar, ela
  // reaparece com o estado antigo; por isso limpamos o formulário quando a tela é escondida.
  useEffect(() => {
    const form = formRef.current;
    return () => {
      form?.reset();
      setLoading(false);
      setMessage("");
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });

    if (error) {
      // Mensagem própria: nunca mostramos o erro bruto do banco.
      setMessage("E-mail ou senha incorretos.");
      setLoading(false);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        E-mail
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className="rounded-md border border-line-strong bg-surface px-4 py-3 text-base focus:border-focus focus:outline-2 focus:outline-focus"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Senha
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="rounded-md border border-line-strong bg-surface px-4 py-3 text-base focus:border-focus focus:outline-2 focus:outline-focus"
        />
      </label>
      <Button type="submit" text={loading ? "Entrando..." : "Entrar"} />
      <p role="alert" className="min-h-5 text-sm text-danger">
        {message}
      </p>
    </form>
  );
}
