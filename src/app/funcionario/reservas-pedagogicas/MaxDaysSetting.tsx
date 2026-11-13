"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/Button";
import { MAX_DAYS_CEILING, parseMaxDaysInput } from "@/domain/pedagogical/reservation-rules";
import type { SetMaxDaysResult } from "@/services/library-settings.service";

interface MaxDaysSettingProps {
  maxDays: number;
  // Server Action: só a funcionária altera (o servidor e o banco conferem de novo).
  save: (rawDays: string) => Promise<SetMaxDaysResult>;
}

// Limite de dias da reserva pedagógica (card 0218): 30 é o padrão e a funcionária pode alterar. O valor novo vale para os
// próximos pedidos; as reservas já feitas não mudam.
export function MaxDaysSetting({ maxDays, save }: MaxDaysSettingProps) {
  const [value, setValue] = useState(String(maxDays));
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string }>();
  const [pending, startTransition] = useTransition();
  const unchanged = value.trim() === String(maxDays);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parseMaxDaysInput(value);
    if (!parsed.ok) return setMessage({ tone: "error", text: parsed.message });
    setMessage(undefined);
    startTransition(async () => {
      const result = await save(String(parsed.days)).catch(() => null);
      if (!result) return setMessage({ tone: "error", text: "Não foi possível salvar agora. Confira a conexão e tente de novo." });
      if (!result.ok) return setMessage({ tone: "error", text: result.message });
      setMessage({ tone: "ok", text: `Limite salvo: ${result.days} dias para os próximos pedidos.` });
    });
  }

  return (
    <form onSubmit={submit} noValidate className="flex shrink-0 flex-col gap-1.5" aria-label="Limite de dias da reserva pedagógica">
      <div className="flex items-center gap-2">
        <label htmlFor="limite-dias" className="text-sm font-medium text-ink">
          Prazo máximo (dias)
        </label>
        <input
          id="limite-dias"
          type="number"
          inputMode="numeric"
          min={1}
          max={MAX_DAYS_CEILING}
          value={value}
          disabled={pending}
          aria-invalid={message?.tone === "error"}
          aria-describedby="limite-dias-aviso"
          onChange={(event) => {
            setValue(event.target.value);
            setMessage(undefined);
          }}
          className="h-8 w-20 rounded-md border border-line bg-surface px-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus disabled:opacity-50"
        />
        <Button text="Salvar" type="submit" variant="secondary" size="small" fullWidth={false} loading={pending} disabled={pending || unchanged} />
      </div>
      <p id="limite-dias-aviso" role={message?.tone === "error" ? "alert" : "status"} className={`min-h-4 text-xs ${message?.tone === "error" ? "text-danger-700" : "text-ink-muted"}`}>
        {message?.text ?? "Padrão: 30 dias. Vale para os próximos pedidos."}
      </p>
    </form>
  );
}
