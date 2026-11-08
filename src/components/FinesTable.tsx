"use client";

import { formatDays } from "../domain/fines/fine-rules";
import type { FineView } from "../types/fine";
import { FineStatusBadge } from "./FineStatusBadge";

export interface FinesTableProps {
  fines: FineView[];
  // Sem esta função, a coluna Ações não aparece (lista só para consulta).
  onPay?: (fine: FineView) => void;
  // Desliga os botões enquanto uma baixa está sendo registrada.
  disabled?: boolean;
}

const HEADERS = ["Usuário", "Livro / empréstimo", "Atraso", "Valor", "Status", "Registro"] as const;

function Person({ fine }: { fine: FineView }) {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-selected text-xs font-medium text-brand">
        {fine.initials}
      </span>
      <div className="min-w-0">
        <p className="font-medium text-ink">{fine.userName}</p>
        <p className="text-xs text-ink-muted">{fine.registration}</p>
      </div>
    </div>
  );
}

function Book({ fine }: { fine: FineView }) {
  return (
    <>
      <p className="font-medium text-ink">{fine.bookTitle}</p>
      <p className="text-xs text-ink-muted">
        Tombo {fine.code} · Prazo {fine.dueOn}
      </p>
    </>
  );
}

// Quem recebeu e quando, nas pagas; "Pendente de recebimento" nas em aberto.
function Registry({ fine }: { fine: FineView }) {
  if (!fine.paid) return <span className="text-ink-muted">Pendente de recebimento</span>;
  return (
    <>
      <p>Pago em {fine.paidAt}</p>
      <p className="text-xs text-ink-muted">Baixa registrada por {fine.paidBy}</p>
    </>
  );
}

// Valor em Inter 500, alinhado à direita (Figma, card 0144); algarismos de largura igual para as casas alinharem.
function Amount({ fine }: { fine: FineView }) {
  return <span className="font-medium whitespace-nowrap text-ink tabular-nums">{fine.amountLabel}</span>;
}

function PayButton({ fine, onPay, disabled }: { fine: FineView; onPay: (fine: FineView) => void; disabled: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={`Dar baixa na multa de ${fine.userName}, ${fine.amountLabel}`}
      onClick={() => onPay(fine)}
      className="h-9 cursor-pointer rounded-md bg-brand px-4 text-sm font-medium whitespace-nowrap text-on-brand hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-60"
    >
      Dar baixa
    </button>
  );
}

// Tabela de multas (Figma, card 0144) no computador e cartões no celular. Só desenha: quem decide a baixa é o banco.
export function FinesTable({ fines, onPay, disabled = false }: FinesTableProps) {
  const headers = onPay ? [...HEADERS, "Ações"] : HEADERS;

  return (
    <div>
      <div className="hidden overflow-hidden rounded-lg border border-line bg-surface md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-subtle text-ink">
            <tr>
              {headers.map((header) => (
                <th key={header} scope="col" className={`px-4 py-3 font-medium ${header === "Valor" ? "text-right" : ""}`}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fines.map((fine) => (
              <tr key={fine.id} className="border-t border-line hover:bg-selected">
                <td className="px-4 py-4"><Person fine={fine} /></td>
                <td className="px-4 py-4"><Book fine={fine} /></td>
                <td className="px-4 py-4 whitespace-nowrap">{formatDays(fine.daysLate)}</td>
                <td className="px-4 py-4 text-right"><Amount fine={fine} /></td>
                <td className="px-4 py-4"><FineStatusBadge paid={fine.paid} /></td>
                <td className="px-4 py-4"><Registry fine={fine} /></td>
                {onPay && (
                  <td className="px-4 py-4">
                    {!fine.paid && <PayButton fine={fine} onPay={onPay} disabled={disabled} />}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-3 md:hidden">
        {fines.map((fine) => (
          <li key={fine.id} className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <Person fine={fine} />
              <FineStatusBadge paid={fine.paid} />
            </div>
            <div className="text-sm">
              <Book fine={fine} />
            </div>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-ink-muted">{formatDays(fine.daysLate)} de atraso</span>
              <Amount fine={fine} />
            </div>
            <div className="text-sm">
              <Registry fine={fine} />
            </div>
            {onPay && !fine.paid && <PayButton fine={fine} onPay={onPay} disabled={disabled} />}
          </li>
        ))}
      </ul>
    </div>
  );
}
