interface ButtonProps {
  text: string;
  type?: "button" | "submit";
}

// Botão do FAP Books, com o azul navy da identidade visual.
export function Button({ text, type = "button" }: ButtonProps) {
  return (
    <button
      type={type}
      className="px-6 py-3 w-full text-sm bg-[#032B5E] text-white rounded-full cursor-pointer hover:bg-[#0D3B6E] transition-colors"
    >
      {text}
    </button>
  );
}
