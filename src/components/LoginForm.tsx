"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Eye, EyeOff, Mail } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { Button } from "./Button";
import { TextField } from "./TextField";

const subscribeNothing = () => () => {};

// Formulário de login. O proxy.ts leva a pessoa para a área do perfil dela depois de entrar.
export function LoginForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  // Falso no servidor e verdadeiro só depois da hidratação. Antes disso o envio fica travado: sem o JavaScript
  // do formulário, o navegador enviaria e-mail e senha pelo endereço da página (visíveis no histórico e nos logs).
  const hydrated = useSyncExternalStore(subscribeNothing, () => true, () => false);

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
      <TextField
        id="email"
        label="E-mail"
        type="email"
        autoComplete="email"
        placeholder="seu.nome@email.com"
        required
        requiredMark={false}
        leadingIcon={Mail}
      />
      <TextField
        id="password"
        label="Senha"
        type={showPassword ? "text" : "password"}
        autoComplete="current-password"
        required
        requiredMark={false}
        trailing={
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            aria-pressed={showPassword}
            className="flex size-8 cursor-pointer items-center justify-center rounded-md text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-focus"
          >
            {showPassword ? <EyeOff size={18} strokeWidth={1.5} aria-hidden /> : <Eye size={18} strokeWidth={1.5} aria-hidden />}
          </button>
        }
      />
      <Button type="submit" text={loading ? "Entrando..." : "Entrar no sistema"} icon={loading ? undefined : ChevronRight} disabled={loading || !hydrated} />
      <p role="alert" className="min-h-5 text-sm text-danger">
        {message}
      </p>
    </form>
  );
}
