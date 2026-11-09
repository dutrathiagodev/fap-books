import { EmptyState, PageHeader } from "@/components";
import { ReservationCard } from "@/components/ReservationCard";
import { ReservationForm } from "@/components/ReservationForm";
import { RolePage } from "@/components/RolePage";
import { todayInBrasilia } from "@/domain/pedagogical/reservation-rules";
import { listMyReservations } from "@/services/pedagogical-reservations.service";
import { requestReservationAction, searchBooksAction } from "./actions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Reserva pedagógica | FAP Books" };

// Só o professor abre: o RolePage confere no servidor, além do proxy.ts. Lê a sessão, por isso fica dentro do Suspense.
export default function ReservaPedagogicaPage() {
  return (
    <RolePage role="teacher">
      {async (profile) => {
        const reservations = await listMyReservations(profile.id);
        return (
          <>
            <PageHeader
              title="Reserva pedagógica"
              breadcrumbs={[{ label: "Início" }, { label: "Reserva pedagógica" }]}
              description="Solicite livros para uso em sala de aula por até 30 dias."
            />
            <div className="flex flex-col gap-8">
              <ReservationForm variant="teacher" today={todayInBrasilia()} searchBooks={searchBooksAction} submit={requestReservationAction} />

              <section aria-labelledby="minhas-reservas">
                <h2 id="minhas-reservas" className="mb-4 text-h3">
                  Minhas reservas pedagógicas
                </h2>
                {reservations.length === 0 ? (
                  <EmptyState title="Nenhuma reserva pedagógica ainda" description="Quando você enviar uma solicitação, ela aparece aqui com a situação." />
                ) : (
                  <ul className="flex flex-col gap-3">
                    {reservations.map((reservation) => (
                      <ReservationCard key={reservation.id} reservation={reservation} />
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </>
        );
      }}
    </RolePage>
  );
}
