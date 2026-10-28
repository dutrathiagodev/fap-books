"use client";

import { TriangleAlert } from "lucide-react";
import { EmptyState } from "@/components";

// Tela de erro da rota do acervo: o que deu errado em uma frase e um jeito de tentar de novo.
export default function AcervoError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-xl p-6">
      <EmptyState
        icon={TriangleAlert}
        title="Não foi possível abrir o acervo"
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
