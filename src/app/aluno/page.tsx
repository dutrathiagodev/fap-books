import { PageHeader } from "@/components";
import { FinePaymentNotice } from "@/components/FinePaymentNotice";
import { RolePage } from "@/components/RolePage";
import { StudentDeadlineNotice } from "@/components/StudentDeadlineNotice";
import { StudentSummaryCards } from "@/components/StudentSummaryCards";
import { getStudentSummary } from "@/services/student.service";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Minha área | FAP Books" };

// Resumo do aluno (cards 0212 e 0214). Só o aluno abre: o RolePage confere no servidor, além do proxy.ts.
// Lê a sessão, por isso fica dentro do Suspense do RolePage.
export default function AlunoPage() {
  return (
    <RolePage role="student">
      {async (profile) => {
        const { summary, loans } = await getStudentSummary(profile.id);
        return (
          <>
            <PageHeader
              title="Minha área"
              breadcrumbs={[{ label: "Início" }, { label: "Minha área" }]}
              description={`Olá, ${profile.fullName.split(" ")[0]}. Veja seus livros, prazos e multas.`}
            />
            <div className="flex flex-col gap-6">
              <StudentSummaryCards summary={summary} />
              <StudentDeadlineNotice summary={summary} loans={loans} />
              {summary.openFineCents > 0 && <FinePaymentNotice />}
            </div>
          </>
        );
      }}
    </RolePage>
  );
}
