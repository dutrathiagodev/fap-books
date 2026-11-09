import { FINE_PER_DAY_CENTS, GRADUATE_LOAN_LIMIT, LOAN_LIMIT, LOAN_PERIOD_DAYS, MAX_RENEWALS, formatReais } from "../loans/loan-rules";
import {
  isLibraryOpen,
  LIBRARY_ADDRESS,
  LIBRARY_EMAIL,
  LIBRARY_PHONE_LABEL,
  LIBRARY_WHATSAPP_LABEL,
  OPENING_HOURS_TEXT,
} from "../library/library-info";

// Assistente de ajuda por regras: sem IA, sem API e sem custo. Reconhece palavras-chave da pergunta e responde o básico;
// quando não encontra, o componente oferece a conversa com a biblioteca pelo WhatsApp.

export interface FaqEntry {
  id: string;
  // Texto do botão de sugestão.
  suggestion: string;
  // Palavras ou trechos (sem acento, minúsculos). Trecho com espaço vale mais que palavra solta.
  keywords: string[];
  // Saudação: só responde quando nenhum outro assunto foi reconhecido ("bom dia, qual o horário?" é sobre horário).
  lowPriority?: boolean;
  answer: (now: Date) => string;
}

// Minúsculas, sem acento e sem pontuação, para "Horário?" casar com "horario".
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const days = (n: number) => (n === 1 ? "1 dia" : `${n} dias`);

export const FAQ: FaqEntry[] = [
  {
    id: "horario",
    suggestion: "Qual o horário?",
    keywords: ["horario", "horarios", "aberta", "aberto", "abre", "fecha", "funcionamento", "que horas", "domingo", "sabado"],
    answer: (now) =>
      `${OPENING_HOURS_TEXT} ${isLibraryOpen(now) ? "Agora a biblioteca está aberta." : "Agora a biblioteca está fechada."}`,
  },
  {
    id: "renovacao",
    suggestion: "Como renovar um empréstimo?",
    keywords: ["renovar", "renovacao", "renovo", "prorrogar", "prorrogacao", "mais tempo", "estender"],
    answer: () =>
      `Dá para renovar até ${MAX_RENEWALS} vezes: cada renovação soma ${days(LOAN_PERIOD_DAYS)} ao prazo atual. Por enquanto a renovação é feita no balcão, com a bibliotecária.`,
  },
  {
    id: "multa",
    suggestion: "Como funciona a multa?",
    keywords: ["multa", "multas", "atraso", "atrasado", "atrasei", "atrasar", "pagar", "pagamento", "debito"],
    answer: () =>
      `A multa é de ${formatReais(FINE_PER_DAY_CENTS)} por dia de atraso, contando dias corridos. O pagamento é feito pessoalmente, no balcão. Enquanto houver multa em aberto, novos empréstimos ficam bloqueados.`,
  },
  {
    id: "limite",
    suggestion: "Quantos livros posso pegar?",
    keywords: ["quantos livros", "limite", "quantos posso", "maximo", "pegar mais", "formando", "formandos"],
    answer: () => `Cada pessoa pode ter até ${LOAN_LIMIT} livros emprestados ao mesmo tempo (${GRADUATE_LOAN_LIMIT} para formandos).`,
  },
  {
    id: "pedagogica",
    suggestion: "O que é reserva pedagógica?",
    keywords: ["pedagogica", "pedagogico", "professor", "docente", "aula", "disciplina"],
    answer: () =>
      "É a reserva antecipada de livros para uso em aula, feita por professores (por até 30 dias). Quem tem perfil de professor pede em \"Reserva pedagógica\", no menu, e a bibliotecária aprova ou recusa.",
  },
  {
    id: "reserva",
    suggestion: "Posso reservar um livro?",
    keywords: ["reservar", "reserva", "reservas", "fila de espera", "lista de espera", "indisponivel"],
    answer: () =>
      "A reserva de livro emprestado pelo sistema ainda não está disponível (aparece como \"Em breve\"). Enquanto isso, fale com a biblioteca para saber quando o livro volta.",
  },
  {
    id: "prazo",
    suggestion: "Qual o prazo de devolução?",
    keywords: ["prazo", "prazos", "quanto tempo", "quantos dias", "devolver", "devolucao", "devolvo", "vencimento", "vence"],
    answer: () => `O prazo padrão é de ${days(LOAN_PERIOD_DAYS)} corridos, contados a partir da retirada. A devolução é feita no balcão da biblioteca.`,
  },
  {
    id: "emprestar",
    suggestion: "Como pego um livro emprestado?",
    keywords: ["emprestar", "emprestimo", "emprestimos", "emprestado", "pegar", "pego", "pegando", "retirar", "retirada", "levar"],
    answer: () =>
      "Procure o livro em \"Buscar livros\" para ver se está disponível e vá até o balcão da biblioteca. A bibliotecária registra o empréstimo no seu nome ou matrícula.",
  },
  {
    id: "busca",
    suggestion: "Como procuro um livro?",
    keywords: ["procurar", "procuro", "procura", "buscar", "busca", "pesquisar", "pesquisa", "acervo", "tem o livro", "encontrar", "achar", "disponivel", "disponibilidade"],
    answer: () =>
      "Use \"Buscar livros\" no menu: digite título, autor ou assunto, e filtre por categoria e disponibilidade. A página do livro mostra quantos exemplares estão livres.",
  },
  {
    id: "contato",
    suggestion: "Qual o contato da biblioteca?",
    keywords: ["contato", "telefone", "ligar", "whatsapp", "zap", "email", "e mail", "endereco", "onde fica", "localizacao", "chegar"],
    answer: () =>
      `Telefone ${LIBRARY_PHONE_LABEL}, WhatsApp ${LIBRARY_WHATSAPP_LABEL} e e-mail ${LIBRARY_EMAIL}. A biblioteca fica ${LIBRARY_ADDRESS}.`,
  },
  {
    id: "acesso",
    suggestion: "Esqueci a senha / não recebi o convite",
    keywords: ["senha", "esqueci", "entrar", "login", "convite", "acesso", "acessar", "cadastro", "cadastrar", "conta"],
    answer: () =>
      "O acesso é feito por convite enviado ao seu e-mail: você define a senha pelo link. Se esqueceu a senha ou o convite não chegou (olhe também o spam), fale com a biblioteca para receber um novo.",
  },
  {
    id: "privacidade",
    suggestion: "O que fazem com meus dados?",
    keywords: ["privacidade", "dados", "lgpd", "meus dados", "seguranca"],
    answer: () =>
      "Seus dados são usados só pela biblioteca e guardados por até 5 anos. Os detalhes estão no aviso de privacidade (rodapé do site).",
  },
  {
    id: "ola",
    suggestion: "",
    lowPriority: true,
    keywords: ["oi", "ola", "bom dia", "boa tarde", "boa noite", "ajuda", "ajudar"],
    answer: () => "Olá! Posso ajudar com horário, prazos, multas, renovação, reservas e contato. É só perguntar ou tocar em uma sugestão.",
  },
];

// Perguntas sugeridas na abertura do assistente (as entradas sem texto de sugestão ficam de fora).
export const SUGGESTIONS = FAQ.filter((entry) => entry.suggestion !== "");

// Acha a resposta mais provável. Cada palavra-chave presente vale 1; trecho com mais de uma palavra vale 2.
// Empate fica com a entrada que vem antes na lista (por isso os assuntos mais específicos vêm primeiro).
// A saudação só responde quando nenhum outro assunto foi reconhecido. Nenhuma palavra reconhecida devolve null.
export function findAnswer(question: string): FaqEntry | null {
  const text = ` ${normalizeText(question)} `;
  if (text.trim() === "") return null;
  const score = (entry: FaqEntry) =>
    entry.keywords.reduce((sum, keyword) => (text.includes(` ${keyword} `) ? sum + (keyword.includes(" ") ? 2 : 1) : sum), 0);

  for (const group of [FAQ.filter((entry) => !entry.lowPriority), FAQ.filter((entry) => entry.lowPriority)]) {
    let best: FaqEntry | null = null;
    let bestScore = 0;
    for (const entry of group) {
      const value = score(entry);
      if (value > bestScore) {
        best = entry;
        bestScore = value;
      }
    }
    if (best) return best;
  }
  return null;
}
