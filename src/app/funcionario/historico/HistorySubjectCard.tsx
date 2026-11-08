import Link from "next/link";
import { BookOpen, UserRound } from "lucide-react";
import type { HistorySubject } from "@/types/loan-history";

interface HistorySubjectCardProps {
  subject: HistorySubject;
  // Quantos empréstimos o período tem (some do cartão quando a lista falhou).
  total: number;
  // Volta para a busca da mesma aba.
  changeHref: string;
}

// Cabeçalho do resultado (Figma, card 0149): a pessoa ou o livro consultado, com os detalhes e o total de empréstimos.
export function HistorySubjectCard({ subject, total, changeHref }: HistorySubjectCardProps) {
  const Icon = subject.kind === "livro" ? BookOpen : UserRound;
  return (
    <section aria-label="Consulta atual" className="mb-6 flex flex-wrap items-center gap-4 rounded-lg border border-line bg-surface p-4">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-selected text-brand">
        <Icon size={24} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-h3 break-words">{subject.title}</h2>
        <p className="text-sm text-ink-muted">{subject.details.join(" · ")}</p>
      </div>
      <p className="text-sm text-ink-muted" role="status">
        <strong className="text-lg font-medium text-ink">{total}</strong> {total === 1 ? "empréstimo" : "empréstimos"}
      </p>
      <Link href={changeHref} className="text-sm font-medium text-link underline">
        Trocar {subject.kind === "livro" ? "livro" : "pessoa"}
      </Link>
    </section>
  );
}
