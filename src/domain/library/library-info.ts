// Dados oficiais da Biblioteca Prof. Renato Gross (fonte: site da FAP e Regulamento 2025).
// Um só lugar para o assistente de ajuda e para os avisos por WhatsApp. O contato da landing (src/content/landing.ts) tem os mesmos números.

export const LIBRARY_WHATSAPP = "554432368065";
export const LIBRARY_WHATSAPP_LABEL = "(44) 3236-8065";
export const LIBRARY_PHONE_LABEL = "(44) 3236-8067";
export const LIBRARY_EMAIL = "biblioteca.fap@educadventista.org.br";
export const LIBRARY_ADDRESS = "no campus da FAP, na PR-317 (Maringá - Campo Mourão), Km 119, Ivatuba - PR";

const LIBRARY_TIME_ZONE = "America/Sao_Paulo";

// Dia da semana (0 = domingo) para [abre, fecha] em minutos desde 00:00. null = fechada.
export const OPENING_HOURS: Record<number, [number, number] | null> = {
  0: [13 * 60 + 30, 18 * 60],
  1: [8 * 60, 22 * 60 + 30],
  2: [8 * 60, 22 * 60 + 30],
  3: [8 * 60, 22 * 60 + 30],
  4: [8 * 60, 22 * 60 + 30],
  5: [8 * 60, 16 * 60 + 30],
  6: null,
};

export const OPENING_HOURS_TEXT =
  "Segunda a quinta, das 8h às 22h30; sexta, das 8h às 16h30; domingo, das 13h30 às 18h. Aos sábados a biblioteca fica fechada.";

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

// A biblioteca está aberta neste instante? Conta pelo horário de Brasília, não pelo do aparelho.
export function isLibraryOpen(now: Date = new Date()): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: LIBRARY_TIME_ZONE,
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const hours = OPENING_HOURS[WEEKDAYS[get("weekday")] ?? -1];
  if (!hours) return false;
  const minutes = Number(get("hour")) * 60 + Number(get("minute"));
  return minutes >= hours[0] && minutes < hours[1];
}
