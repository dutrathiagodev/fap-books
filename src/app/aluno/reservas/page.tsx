import { PageHeader } from "@/components";
import { RolePage } from "@/components/RolePage";
import { StudentReservationList } from "@/components/StudentReservationList";
import { listMyBookReservations } from "@/services/student.service";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Minhas reservas | FAP Books" };

export default function MinhasReservasPage() {
  return (
    <RolePage role="student">
      {async (profile) => {
        const reservations = await listMyBookReservations(profile.id);
        return (
          <>
            <PageHeader
              title="Minhas reservas"
              breadcrumbs={[{ label: "Minha área" }, { label: "Minhas reservas" }]}
              description="Livros que você reservou enquanto estavam sem exemplar livre."
            />
            <StudentReservationList reservations={reservations} />
          </>
        );
      }}
    </RolePage>
  );
}
