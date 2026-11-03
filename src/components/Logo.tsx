import Image from "next/image";

interface LogoProps {
  width?: number;
  // "auto" troca com o tema; "white" é para fundos navy, como o menu lateral.
  tone?: "auto" | "white";
}

// Cada PNG tem a sua proporção (altura ÷ largura). Usar a mesma nos dois faz a altura declarada diferir da real
// e o Next avisa no console.
const LIGHT = { src: "/logo-modo-claro.png", ratio: 715 / 1033 };
const DARK = { src: "/logo-modo-escuro.png", ratio: 703 / 1036 };

function LogoImage({ logo, width, className }: { logo: typeof LIGHT; width: number; className: string }) {
  return (
    <Image
      src={logo.src}
      alt="FAP Books"
      width={width}
      height={Math.round(width * logo.ratio)}
      priority
      className={className}
    />
  );
}

// Logo do FAP Books: azul no modo claro e branca no modo escuro (troca sozinha com o tema).
export function Logo({ width = 160, tone = "auto" }: LogoProps) {
  if (tone === "white") return <LogoImage logo={DARK} width={width} className="block" />;

  return (
    <>
      <LogoImage logo={LIGHT} width={width} className="block dark:hidden" />
      <LogoImage logo={DARK} width={width} className="hidden dark:block" />
    </>
  );
}
