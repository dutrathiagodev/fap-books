import { CircleAlert, Mail } from "lucide-react";
import { LOGIN_PATH, SUPPORT_PATH } from "@/domain/access/access-rules";
import { Button } from "./Button";
import { TextLink } from "./TextLink";

export type InviteLinkProblemKind = "invalid" | "used" | "inactive";

const CONTENT: Record<InviteLinkProblemKind, { title: string; text: string }> = {
  invalid: {
    title: "Este link não vale mais",
    text: "O link expirou, já foi usado ou está incompleto. Por segurança, cada link funciona uma única vez e por tempo limitado.",
  },
  used: {
    title: "Não conseguimos salvar a sua senha",
    text: "O link já foi usado, mas a senha não chegou a ser salva. Nada foi perdido: é só pedir um novo link.",
  },
  inactive: {
    title: "Seu acesso está desativado",
    text: "O seu cadastro na biblioteca está inativo, por isso não foi possível definir a senha.",
  },
};

// Aviso amigável de link de convite que não pode ser usado, com o que fazer em seguida. Sem detalhes técnicos.
export function InviteLinkProblem({ kind }: { kind: InviteLinkProblemKind }) {
  const { title, text } = CONTENT[kind];
  return (
    <div role="alert" className="flex w-full flex-col gap-4">
      <span className="flex size-12 items-center justify-center rounded-full bg-warning-100 text-warning-700">
        <CircleAlert size={24} strokeWidth={1.5} aria-hidden />
      </span>
      <h2 className="text-h3">{title}</h2>
      <p className="text-base text-ink-muted">{text}</p>
      <p className="flex items-start gap-2 rounded-md bg-subtle px-4 py-3 text-sm text-ink-muted">
        <Mail size={16} strokeWidth={1.5} aria-hidden className="mt-0.5 shrink-0" />
        <span>
          Peça à biblioteca da FAP que envie um novo link (convite ou redefinição de senha) para o seu e-mail. Já definiu a senha antes? Basta entrar.{" "}
          <TextLink href={SUPPORT_PATH}>Falar com a biblioteca</TextLink>
        </span>
      </p>
      <Button href={LOGIN_PATH} text="Ir para o login" variant="secondary" />
    </div>
  );
}
