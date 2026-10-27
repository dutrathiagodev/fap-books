interface ButtonProps {
  text: string;
  type?: "button" | "submit";
}

// Botão do FAP Books, com o azul navy da identidade visual.
export function Button({ text, type = "button" }: ButtonProps) {
  return (
    <button
      type={type}
      className="px-6 py-3 w-full text-sm font-medium bg-brand text-on-brand rounded-md cursor-pointer hover:bg-brand-hover transition-colors"
    >
      {text}
    </button>
  );
}
