// Textos e dados da landing page (Figma, cards 0195 e 0198).
// Fica separado dos componentes para a equipe poder ajustar um texto sem mexer na marcação.
// Dados da biblioteca: página oficial da FAP e Regulamento 2025 (conferidos em 27/10/2026).

export interface Profile {
  eyebrow: string;
  title: string;
  text: string;
}

export const PROFILES: Profile[] = [
  {
    eyebrow: "Para",
    title: "Alunos",
    text: "Pesquise o acervo, veja o que está disponível, acompanhe prazos e multas, renove e reserve livros.",
  },
  {
    eyebrow: "Para",
    title: "Professores",
    text: "Peça com antecedência a reserva pedagógica para a sua disciplina, por até 30 dias.",
  },
  {
    eyebrow: "Para a",
    title: "Equipe da biblioteca",
    text: "Cadastre livros e usuários, registre empréstimos e devoluções e aprove reservas em um painel só.",
  },
];

// Cursos de graduação atendidos (decisão do dono do projeto em 27/10/2026).
export const COURSES = [
  "Teologia",
  "Tecnologia (GTI, ADS e Redes)",
  "Pedagogia",
  "Ciências Contábeis",
  "Enfermagem",
  "Psicologia",
];

export interface ResourceTab {
  id: string;
  label: string;
  text: string;
}

export const RESOURCE_TABS: ResourceTab[] = [
  {
    id: "busca",
    label: "Busca no acervo",
    text: "Pesquise por título, autor, assunto ou código e veja na hora se o livro está disponível, emprestado ou reservado.",
  },
  {
    id: "emprestimos",
    label: "Empréstimos",
    text: "Acompanhe os seus empréstimos, veja a data de devolução e renove antes do prazo vencer.",
  },
  {
    id: "reservas",
    label: "Reservas",
    text: "Reserve livros emprestados e, se você é professor, peça a reserva pedagógica para a sua disciplina.",
  },
  {
    id: "painel",
    label: "Painel",
    text: "Veja empréstimos, prazos, avisos e multas em um painel só, no computador ou no celular.",
  },
];

// Regras do Regulamento 2025 (alunos do ensino superior).
export const NUMBERS = [
  { value: "7 dias", label: "de prazo de empréstimo" },
  { value: "3 livros", label: "por pessoa ao mesmo tempo" },
  { value: "30 dias", label: "na reserva pedagógica" },
  { value: "R$ 1,00", label: "de multa por dia de atraso" },
];

export interface NewsItem {
  title: string;
  text: string;
}

export const NEWS: NewsItem[] = [
  {
    title: "Novos livros chegaram ao acervo",
    text: "Confira as últimas aquisições da Biblioteca Professor Renato Gross.",
  },
  {
    title: "Como funciona a reserva pedagógica",
    text: "Professores podem reservar livros por até 30 dias para as suas disciplinas.",
  },
  {
    title: "Evite multas: renove o seu empréstimo",
    text: "Veja como renovar os livros antes do prazo vencer.",
  },
];

export interface Question {
  question: string;
  answer: string;
}

export const FAQ: Question[] = [
  {
    question: "Quanto tempo posso ficar com um livro?",
    answer: "O prazo de empréstimo é de 7 dias. O FAP Books mostra a data de devolução e você pode renovar online.",
  },
  {
    question: "Quantos livros posso pegar?",
    answer: "Até 3 livros ao mesmo tempo. Quem está no último ano (formandos) pode pegar até 4.",
  },
  {
    question: "O que acontece se eu atrasar a devolução?",
    answer: "A multa é de R$ 1,00 por livro e por dia de atraso. Você acompanha as multas na sua área do FAP Books.",
  },
  {
    question: "Como peço o meu acesso?",
    answer:
      "O cadastro é confirmado pela equipe da biblioteca. Depois, você recebe o convite por e-mail e entra com e-mail e senha.",
  },
  {
    question: "Como funciona a reserva pedagógica?",
    answer: "Professores pedem com antecedência a reserva de livros para a disciplina, por até 30 dias.",
  },
];

export interface OpeningHour {
  days: string;
  hours: string;
}

export const OPENING_HOURS: OpeningHour[] = [
  { days: "Segunda à quinta", hours: "08h às 22h30" },
  { days: "Sexta-feira", hours: "08h às 16h30" },
  { days: "Domingo", hours: "13h30 às 18h" },
  { days: "Sábado", hours: "Fechado" },
];

// Contato oficial. href é montado só com e-mail e dígitos (sem texto livre de usuário).
export const CONTACTS = [
  { label: "E-mail", value: "biblioteca.fap@educadventista.org.br", href: "mailto:biblioteca.fap@educadventista.org.br" },
  { label: "Telefone", value: "(44) 3236-8067", href: "tel:+554432368067" },
  { label: "WhatsApp", value: "(44) 3236-8065", href: "https://wa.me/554432368065" },
  { label: "Instagram", value: "@bibliotecafap", href: "https://www.instagram.com/bibliotecafap" },
];

export const ADDRESS = {
  place: "Campus da FAP, perto da faculdade, subindo a escadaria",
  street: "PR-317 (Maringá - Campo Mourão) Km 119, Gleba Paiçandu, Lote 80, Zona Rural, Ivatuba - PR",
  coordinator: "Poliana Fragatti Cristovam",
};
