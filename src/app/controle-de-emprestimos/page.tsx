import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { LoadingState } from "@/components/LoadingState";
import { LoanRecordsApp } from "@/components/controle/LoanRecordsApp";
import { LOAN_TRACKER_PATH, LOGIN_PATH, ROLE_LANDING } from "@/domain/access/access-rules";
import { todayIso } from "@/domain/loan-records/loan-record-rules";
import { listLoanRecords } from "@/services/loan-records.service";
import { getCurrentProfile } from "@/services/profile.service";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Controle de empréstimos | FAP Books" };

// Controle de empréstimo de livros (atividade da disciplina): o caderno pessoal de quem está logado.
// Cadastrar, marcar como devolvido e excluir gravam no Supabase; cada pessoa vê só os próprios registros (RLS).
async function ControleContent() {
  const profile = await getCurrentProfile();
  if (!profile) redirect(`${LOGIN_PATH}?next=${encodeURIComponent(LOAN_TRACKER_PATH)}`);

  const result = await listLoanRecords();
  // Hoje no calendário de Brasília, o mesmo da biblioteca (o servidor roda em UTC).
  const today = todayIso(new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })));

  return (
    <main className="flex-1 bg-page px-4 py-8 md:py-12">
      <div className="mx-auto flex w-full max-w-[960px] flex-col gap-6">
        <Link
          href={ROLE_LANDING[profile.role]}
          className="inline-flex items-center gap-2 text-sm font-medium text-link hover:underline focus-visible:outline-2 focus-visible:outline-focus"
        >
          <ArrowLeft size={16} aria-hidden />
          Voltar ao sistema
        </Link>
        <header className="flex flex-col gap-2">
          <h1 className="text-h2 md:text-h1">Controle de empréstimos</h1>
          <p className="text-base text-ink-muted">
            Registre os livros emprestados, acompanhe as devoluções e veja o histórico. Só você enxerga estes registros.
          </p>
        </header>
        {result.ok ? (
          <LoanRecordsApp initialRecords={result.data} today={today} />
        ) : (
          <p role="alert" className="rounded-lg border border-line bg-surface p-4 text-danger-700 dark:text-red-300">
            Não foi possível carregar os empréstimos agora. Atualize a página.
          </p>
        )}
      </div>
    </main>
  );
}

// A leitura de quem está logado muda por pessoa: fica dentro do Suspense (o mesmo esqueleto das telas logadas).
export default function ControleDeEmprestimosPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ControleContent />
    </Suspense>
  );
}
