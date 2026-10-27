"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Eye, EyeOff, Mail } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { Button } from "./Button";

// Formulário de login. O proxy.ts leva a pessoa para a área do perfil dela depois de entrar.
export function LoginForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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

  const campo =
    "h-12 w-full rounded-md border border-line-strong bg-surface text-base text-ink placeholder:text-ink-muted focus:border-focus focus:outline-2 focus:outline-focus";

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          E-mail
        </label>
        <div className="relative">
          <Mail
            size={18}
            strokeWidth={1.5}
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
          />
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="seu.nome@email.com"
            required
            className={`${campo} pl-10 pr-4`}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          Senha
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            className={`${campo} pl-4 pr-12`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            aria-pressed={showPassword}
            className="absolute right-1 top-1/2 flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-focus"
          >
            {showPassword ? <EyeOff size={18} strokeWidth={1.5} aria-hidden /> : <Eye size={18} strokeWidth={1.5} aria-hidden />}
          </button>
        </div>
      </div>
      <Button type="submit" text={loading ? "Entrando..." : "Entrar no sistema"} icon={loading ? undefined : ChevronRight} disabled={loading} />
      <p role="alert" className="min-h-5 text-sm text-danger">
        {message}
      </p>
    </form>
  );
}
