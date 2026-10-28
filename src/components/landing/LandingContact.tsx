import { Clock, Home, Mail, type LucideIcon } from "lucide-react";
import { ADDRESS, CONTACTS, OPENING_HOURS } from "@/content/landing";
import { SectionIntro } from "./SectionIntro";

function InfoCard({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: React.ReactNode }) {
  return (
    <li className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-6 shadow-sm">
      <h3 className="flex items-center gap-3 font-heading text-h3">
        <span aria-hidden className="flex size-9 items-center justify-center rounded-full bg-selected text-brand">
          <Icon size={18} strokeWidth={1.5} />
        </span>
        {title}
      </h3>
      {children}
    </li>
  );
}

// Horário, contato e endereço da biblioteca (Figma, card 0195). Dados oficiais em src/content/landing.ts.
export function LandingContact() {
  return (
    <section id="contato" aria-label="Horário e contato" className="bg-page">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-10 px-4 py-14 md:px-8 md:py-20">
        <SectionIntro
          eyebrow="Horário e contato"
          title="Venha nos visitar ou fale com a gente"
          text="Biblioteca Professor Renato Gross, no campus da FAP, subindo a escadaria."
        />
        <ul className="grid gap-6 md:grid-cols-3">
          <InfoCard icon={Clock} title="Horário">
            <dl className="flex flex-col gap-3 text-sm">
              {OPENING_HOURS.map(({ days, hours }) => (
                <div key={days}>
                  <dt className="text-ink-muted">{days}</dt>
                  <dd className="font-semibold">{hours}</dd>
                </div>
              ))}
            </dl>
          </InfoCard>

          <InfoCard icon={Mail} title="Contato">
            <dl className="flex flex-col gap-3 text-sm">
              {CONTACTS.map(({ label, value, href }) => (
                <div key={label}>
                  <dt className="text-ink-muted">{label}</dt>
                  <dd className="font-semibold">
                    <a
                      href={href}
                      {...(href.startsWith("https://") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      className="break-words underline hover:text-link focus-visible:outline-2 focus-visible:outline-focus"
                    >
                      {value}
                    </a>
                  </dd>
                </div>
              ))}
            </dl>
          </InfoCard>

          <InfoCard icon={Home} title="Endereço">
            <dl className="flex flex-col gap-3 text-sm">
              <div>
                <dt className="text-ink-muted">Local</dt>
                <dd className="font-semibold">{ADDRESS.place}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Endereço</dt>
                <dd className="font-semibold">{ADDRESS.street}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Coordenadora</dt>
                <dd className="font-semibold">{ADDRESS.coordinator}</dd>
              </div>
            </dl>
          </InfoCard>
        </ul>
      </div>
    </section>
  );
}
