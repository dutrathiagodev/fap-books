import { BookOpen } from "lucide-react";
import { EmptyState, PageHeader } from "@/components";
import { RolePage } from "@/components/RolePage";
import { StudentLoanList } from "@/components/StudentLoanList";
import { GRADUATE_LOAN_LIMIT, LOAN_LIMIT, LOAN_PERIOD_DAYS, MAX_RENEWALS } from "@/domain/loans/loan-rules";
import { listMyLoans } from "@/services/student.service";
import { renewMyLoanAction } from "./actions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Meus empréstimos | FAP Books" };

export default function MeusEmprestimosPage() {
  return (
    <RolePage role="student">
      {async (profile) => {
        const loans = await listMyLoans(profile.id);
        return (
          <>
            <PageHeader
              title="Meus empréstimos"
              breadcrumbs={[{ label: "Minha área" }, { label: "Meus empréstimos" }]}
              description={`Prazo de ${LOAN_PERIOD_DAYS} dias, até ${MAX_RENEWALS} renovações. Limite de ${LOAN_LIMIT} livros (${GRADUATE_LOAN_LIMIT} para formandos).`}
            />
            {loans.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="Você não tem livros emprestados"
                description="Procure um livro no acervo e retire na biblioteca. Os empréstimos aparecem aqui."
              />
            ) : (
              <StudentLoanList loans={loans} renew={renewMyLoanAction} />
            )}
          </>
        );
      }}
    </RolePage>
  );
}
