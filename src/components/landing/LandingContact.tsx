import { Clock, Home, Mail, type LucideIcon } from "lucide-react";
import { ADDRESS, CONTACTS, OPENING_HOURS } from "@/content/landing";
import { CONTAINER } from "./styles";

function InfoCard({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: React.ReactNode }) {
  return (
    <li className="flex flex-col rounded-2xl border border-line bg-surface p-[29px] lg:h-[354px]">
      <h3 className="flex items-center gap-[14px] font-heading text-[22px] font-semibold leading-[30px]">
        <span aria-hidden className="flex size-11 items-center justify-center rounded-[10px] bg-selected text-brand dark:bg-navy-900">
          <Icon size={22} strokeWidth={1.5} />
        </span>
        {title}
      </h3>
      {children}
    </li>
  );
}

// Linhas de "rótulo e valor" dos cartões: rótulo cinza de 14 px e valor SemiBold de 15 px (passo de 62 px no Figma).
const ROWS = "mt-[18px] flex flex-col gap-[18px] text-[15px] leading-[22px]";
const LABEL = "text-sm leading-5 text-ink-muted";
const VALUE = "font-semibold";

// Horário, contato e endereço da biblioteca (Figma, card 0195: 652 px, cartões de 357×354 com 24 px entre eles).
// Dados oficiais em src/content/landing.ts.
export function LandingContact() {
  return (
    <section id="contato" aria-label="Horário e contato" className="bg-subtle">
      <div className={`${CONTAINER} py-14 lg:min-h-[652px] lg:py-[77px] lg:px-[72px]`}>
        <div>
          <span className="text-[13px] font-semibold uppercase leading-[18px] text-eyebrow">Horário e contato</span>
          <h2 className="mt-2.5 font-heading text-[28px] font-semibold leading-9">Venha nos visitar ou fale com a gente</h2>
          <p className="mt-2.5 text-base leading-6 text-ink-muted">
            Biblioteca Professor Renato Gross, no campus da FAP, subindo a escadaria.
          </p>
        </div>
        <ul className="mt-10 grid gap-6 md:grid-cols-3">
          <InfoCard icon={Clock} title="Horário">
            <dl className={ROWS}>
              {OPENING_HOURS.map(({ days, hours }) => (
                <div key={days}>
                  <dt className={LABEL}>{days}</dt>
                  <dd className={VALUE}>{hours}</dd>
                </div>
              ))}
            </dl>
          </InfoCard>

          <InfoCard icon={Mail} title="Contato">
            <dl className={ROWS}>
              {CONTACTS.map(({ label, value, href }) => (
                <div key={label}>
                  <dt className={LABEL}>{label}</dt>
                  <dd className={VALUE}>
                    <a
                      href={href}
                      {...(href.startsWith("https://") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      className="break-words hover:text-link focus-visible:outline-2 focus-visible:outline-focus"
                    >
                      {value}
                    </a>
                  </dd>
                </div>
              ))}
            </dl>
          </InfoCard>

          <InfoCard icon={Home} title="Endereço">
            <dl className={ROWS}>
              <div>
                <dt className={LABEL}>Local</dt>
                <dd className={VALUE}>{ADDRESS.place}</dd>
              </div>
              <div>
                <dt className={LABEL}>Endereço</dt>
                <dd className={VALUE}>{ADDRESS.street}</dd>
              </div>
              <div>
                <dt className={LABEL}>Coordenadora</dt>
                <dd className={VALUE}>{ADDRESS.coordinator}</dd>
              </div>
            </dl>
          </InfoCard>
        </ul>
      </div>
    </section>
  );
}
