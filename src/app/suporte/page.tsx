import type { Metadata } from "next";
import { InfoPage } from "@/components/InfoPage";
import { ADDRESS, CONTACTS, OPENING_HOURS } from "@/content/landing";

export const metadata: Metadata = { title: "Suporte | FAP Books" };

// Suporte (Figma, rodapé do card 0195): canais e horários oficiais da biblioteca, vindos de src/content/landing.ts.
export default function SuportePage() {
  return (
    <InfoPage
      title="Suporte"
      intro="Precisa de ajuda com o acesso, um empréstimo ou uma reserva? Fale com a equipe da Biblioteca Professor Renato Gross."
    >
      <section className="flex flex-col gap-2">
        <h2>Contato</h2>
        <ul>
          {CONTACTS.map(({ label, value, href }) => (
            <li key={label}>
              {label}:{" "}
              <a href={href} {...(href.startsWith("https://") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                {value}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2>Horário de atendimento</h2>
        <ul>
          {OPENING_HOURS.map(({ days, hours }) => (
            <li key={days}>
              {days}: {hours}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2>Onde fica</h2>
        <p>
          {ADDRESS.place}. {ADDRESS.street}.
        </p>
        <p>Coordenadora: {ADDRESS.coordinator}.</p>
      </section>
    </InfoPage>
  );
}
