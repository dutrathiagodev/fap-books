import { EmptyState, PageHeader } from "@/components";
import { RenewalRequest } from "@/components/RenewalRequest";
import { ReservationCard } from "@/components/ReservationCard";
import { ReservationForm } from "@/components/ReservationForm";
import { RolePage } from "@/components/RolePage";
import { renewalStateOf } from "@/domain/pedagogical/renewal-rules";
import { todayInBrasilia } from "@/domain/pedagogical/reservation-rules";
import { getPedagogicalMaxDays } from "@/services/library-settings.service";
import { listMyReservations } from "@/services/pedagogical-reservations.service";
import { requestRenewalAction, requestReservationAction, searchBooksAction } from "./actions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Reserva pedagógica | FAP Books" };

// Só o professor abre: o RolePage confere no servidor, além do proxy.ts. Lê a sessão, por isso fica dentro do Suspense.
export default function ReservaPedagogicaPage() {
  return (
    <RolePage role="teacher">
      {async (profile) => {
        const [reservations, maxDays] = await Promise.all([listMyReservations(profile.id), getPedagogicalMaxDays()]);
        return (
          <>
            <PageHeader
              title="Reserva pedagógica"
              breadcrumbs={[{ label: "Início" }, { label: "Reserva pedagógica" }]}
              description={`Solicite livros para uso em sala de aula por até ${maxDays} dias.`}
            />
            <div className="flex flex-col gap-8">
              <ReservationForm variant="teacher" today={todayInBrasilia()} searchBooks={searchBooksAction} submit={requestReservationAction} maxDays={maxDays} />

              <section aria-labelledby="minhas-reservas">
                <h2 id="minhas-reservas" className="mb-4 text-h3">
                  Minhas reservas pedagógicas
                </h2>
                {reservations.length === 0 ? (
                  <EmptyState title="Nenhuma reserva pedagógica ainda" description="Quando você enviar uma solicitação, ela aparece aqui com a situação." />
                ) : (
                  <ul className="flex flex-col gap-3">
                    {reservations.map((reservation) => {
                      // Renovar: só reserva aprovada na última semana do prazo e sem pedido pendente (o banco confere de novo).
                      const renewal = renewalStateOf(reservation, reservations);
                      return (
                        <ReservationCard
                          key={reservation.id}
                          reservation={reservation}
                          renewalNote={renewal.kind === "too_early" ? `Você poderá pedir a renovação a partir de ${renewal.opensOn}.` : undefined}
                          actions={
                            renewal.kind === "open" ? (
                              <RenewalRequest reservationId={reservation.id} endOn={reservation.endOn} maxDays={maxDays} onRequest={requestRenewalAction} />
                            ) : undefined
                          }
                        />
                      );
                    })}
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
