"use client";

import { useRef } from "react";

// Uma chave de idempotência (uuid) por ação pendente. A mesma chave vale enquanto a ação não termina com sucesso:
// clique duplo ou nova tentativa depois de uma falha de rede enviam a MESMA chave e o banco registra uma vez só.
// Depois do sucesso (ou de um erro de regra) chame done(id): a próxima ação sobre o mesmo item ganha uma chave nova.
export function useActionKeys() {
  const keys = useRef(new Map<string, string>());
  return {
    keyFor(id: string): string {
      let key = keys.current.get(id);
      if (!key) {
        key = crypto.randomUUID();
        keys.current.set(id, key);
      }
      return key;
    },
    done(id: string) {
      keys.current.delete(id);
    },
  };
}
