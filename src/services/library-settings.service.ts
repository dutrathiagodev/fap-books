import { connection } from "next/server";
import { DEFAULT_MAX_DAYS, MAX_DAYS_CEILING, MAX_DAYS_RANGE_MESSAGE } from "@/domain/pedagogical/reservation-rules";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

// Configurações da biblioteca (tabela library_settings). Hoje só o limite de dias da reserva pedagógica (card 0218):
// 30 é o padrão e a funcionária pode alterar. Quem decide de verdade é o banco; aqui o app lê o valor para avisar a
// pessoa antes de enviar e para escrever o limite certo nas telas.

// Limite de dias do dia. Se a leitura falhar, vale o padrão (o banco recusa o que passar do limite real).
export async function getPedagogicalMaxDays(): Promise<number> {
  await connection();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("library_settings").select("int_value").eq("key", "pedagogical_max_days").limit(1).maybeSingle();
  if (error || !data) return DEFAULT_MAX_DAYS;
  const days = Number(data.int_value);
  return Number.isInteger(days) && days >= 1 && days <= MAX_DAYS_CEILING ? days : DEFAULT_MAX_DAYS;
}

export type SetMaxDaysResult = { ok: true; days: number } | { ok: false; message: string };

// Só a funcionária altera (o banco confere o perfil). O valor novo vale para os próximos pedidos; os já feitos não mudam.
export async function setPedagogicalMaxDays(days: number): Promise<SetMaxDaysResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("set_pedagogical_max_days", { p_days: days });
  if (!error) return { ok: true, days };
  if (error.code === "42501" || error.message === "not_allowed") return { ok: false, message: "Só a funcionária da biblioteca altera o limite." };
  if (error.message === "invalid_max_days") return { ok: false, message: MAX_DAYS_RANGE_MESSAGE };
  return { ok: false, message: "Não foi possível salvar agora. Tente de novo." };
}
