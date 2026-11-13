import { PageHeader } from "@/components";
import { RolePage } from "@/components/RolePage";
import { StudentFineList } from "@/components/StudentFineList";
import { listMyFines } from "@/services/student.service";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Minhas multas | FAP Books" };

export default function MinhasMultasPage() {
  return (
    <RolePage role="student">
      {async (profile) => {
        const fines = await listMyFines(profile.id);
        return (
          <>
            <PageHeader
              title="Multas"
              breadcrumbs={[{ label: "Minha área" }, { label: "Multas" }]}
              description="Multas por atraso na devolução. O pagamento é presencial, na biblioteca."
            />
            <StudentFineList fines={fines} />
          </>
        );
      }}
    </RolePage>
  );
}
