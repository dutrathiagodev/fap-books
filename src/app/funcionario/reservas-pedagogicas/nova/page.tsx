import { PageHeader } from "@/components";
import { ReservationForm } from "@/components/ReservationForm";
import { RolePage } from "@/components/RolePage";
import { todayInBrasilia } from "@/domain/pedagogical/reservation-rules";
import { registerInPersonAction, searchBooksAction, searchTeachersAction } from "../actions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Registrar reserva pedagógica | FAP Books" };

// Só a funcionária abre: o RolePage confere no servidor, além do proxy.ts.
export default function NovaReservaPedagogicaPage() {
  return (
    <RolePage role="librarian">
      {() => (
        <>
          <PageHeader
            title="Registrar reserva presencial"
            breadcrumbs={[{ label: "Biblioteca" }, { label: "Reservas pedagógicas" }, { label: "Registrar presencial" }]}
            description="Registre no balcão a solicitação de um professor. Ela entra na fila de aprovação."
          />
          <ReservationForm
            variant="in_person"
            today={todayInBrasilia()}
            searchBooks={searchBooksAction}
            searchTeachers={searchTeachersAction}
            submit={registerInPersonAction}
          />
        </>
      )}
    </RolePage>
  );
}
