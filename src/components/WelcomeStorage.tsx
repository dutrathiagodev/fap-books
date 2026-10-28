"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { WELCOME_SEEN_KEY, DESKTOP_MIN_WIDTH_PX, shouldShowWelcome } from "@/domain/welcome/welcome-rules";
import { WELCOME_PATH } from "@/domain/access/access-rules";

// localStorage pode falhar (navegação privada, bloqueio): nesse caso tratamos como "já viu" para não repetir.
function hasSeenWelcome(): boolean {
  try {
    return window.localStorage.getItem(WELCOME_SEEN_KEY) === "1";
  } catch {
    return true;
  }
}

function markWelcomeSeen() {
  try {
    window.localStorage.setItem(WELCOME_SEEN_KEY, "1");
  } catch {
    // Sem armazenamento: a pessoa só não terá o "primeiro acesso" lembrado.
  }
}

// Colocado na raiz (landing): no celular, no primeiro acesso, leva para as boas-vindas. Não desenha nada.
export function FirstVisitRedirect() {
  const router = useRouter();

  useEffect(() => {
    const isMobile = !window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH_PX}px)`).matches;
    if (shouldShowWelcome({ isMobile, alreadySeen: hasSeenWelcome() })) router.replace(WELCOME_PATH);
  }, [router]);

  return null;
}

// Colocado nas boas-vindas: marca que a pessoa já viu, para a raiz não mandar de novo. Não desenha nada.
export function WelcomeSeenMarker() {
  useEffect(markWelcomeSeen, []);
  return null;
}
