import Image from "next/image";

interface LogoProps {
  width?: number;
  // "auto" troca com o tema; "white" é para fundos navy, como o menu lateral.
  tone?: "auto" | "white";
}

// Logo do FAP Books: azul no modo claro e branca no modo escuro (troca sozinha com o tema).
export function Logo({ width = 160, tone = "auto" }: LogoProps) {
  const height = Math.round(width * (715 / 1033));

  if (tone === "white") {
    return <Image src="/logo-modo-escuro.png" alt="FAP Books" width={width} height={height} priority className="block" />;
  }

  return (
    <>
      <Image
        src="/logo-modo-claro.png"
        alt="FAP Books"
        width={width}
        height={height}
        priority
        className="block dark:hidden"
      />
      <Image
        src="/logo-modo-escuro.png"
        alt="FAP Books"
        width={width}
        height={height}
        priority
        className="hidden dark:block"
      />
    </>
  );
}
