"use client";

import { TriangleAlert } from "lucide-react";
import { EmptyState } from "./EmptyState";

interface PageErrorProps {
  error: Error;
  reset: () => void;
  // Cada área pode dizer o que não abriu (ex.: "o acervo").
  title?: string;
}

// Tela de erro de uma rota: o que deu errado em uma frase e um jeito de tentar de novo.
export function PageError({ reset, title = "Não foi possível abrir esta página" }: PageErrorProps) {
  return (
    <main className="mx-auto max-w-xl p-6">
      <EmptyState
        icon={TriangleAlert}
        title={title}
        description="Tente de novo em instantes. Se continuar, avise a equipe do sistema."
        action={
          <button
            type="button"
            onClick={reset}
            className="cursor-pointer rounded-md bg-brand px-5 py-2 text-sm font-medium text-on-brand hover:bg-brand-hover"
          >
            Tentar de novo
          </button>
        }
      />
    </main>
  );
}
