"use client";

import { useEffect } from "react";

// Se o navegador devolver esta tela do cache de "voltar/avançar" (bfcache), recarrega: o servidor confere a sessão
// de novo e, depois de Sair, leva ao login em vez de mostrar os dados de quem saiu (FAP-0261).
export function ReloadOnBackForward() {
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);
  return null;
}
