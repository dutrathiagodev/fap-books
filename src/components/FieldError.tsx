import { CircleAlert } from "lucide-react";

export interface FieldErrorProps {
  message: string;
  // Liga a mensagem ao campo por aria-describedby.
  id?: string;
  // Margens de quem usa (por exemplo, "mt-2").
  className?: string;
}

// Mensagem de erro de um campo (Figma: 12 px, vermelha, com ícone). Fica igual em formulário, upload, busca e tabela.
export function FieldError({ message, id, className = "" }: FieldErrorProps) {
  return (
    <p id={id} role="alert" className={`flex items-start gap-1 text-xs text-danger-700 ${className}`.trim()}>
      <CircleAlert size={12} strokeWidth={1.5} aria-hidden className="mt-0.5 shrink-0" />
      {message}
    </p>
  );
}
