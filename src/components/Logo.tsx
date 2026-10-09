import Image from "next/image";

interface LogoProps {
  width?: number;
}

// Logo do FAP Books: azul no modo claro e branca no modo escuro (troca sozinha com o tema).
export function Logo({ width = 160 }: LogoProps) {
  const height = Math.round(width * (715 / 1033));

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
