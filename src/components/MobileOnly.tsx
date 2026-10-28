"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DESKTOP_MIN_WIDTH_PX } from "@/domain/welcome/welcome-rules";

interface MobileOnlyProps {
  // Para onde ir quando a tela é de computador.
  desktopHref: string;
  children: React.ReactNode;
}

// Mostra o conteúdo só no celular. No computador (a partir de md, 768 px) leva direto para outra página.
// O conteúdo já nasce escondido no computador (md:invisible) para não piscar antes de redirecionar.
export function MobileOnly({ desktopHref, children }: MobileOnlyProps) {
  const router = useRouter();

  useEffect(() => {
    const desktop = window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH_PX}px)`);
    if (desktop.matches) router.replace(desktopHref);
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) router.replace(desktopHref);
    };
    desktop.addEventListener("change", onChange);
    return () => desktop.removeEventListener("change", onChange);
  }, [desktopHref, router]);

  return <div className="flex flex-1 flex-col md:invisible">{children}</div>;
}
