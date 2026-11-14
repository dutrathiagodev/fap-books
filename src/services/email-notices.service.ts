import { createSupabaseServerClient } from "@/lib/supabase/server-client";

// Preferência de receber o aviso de prazo por e-mail (LGPD). Só a própria pessoa lê (RLS) e só ela muda,
// pela função set_my_email_notices (a policy de update de profiles continua só da bibliotecária).

// true = recebe (padrão). Em caso de erro devolve null: a tela mostra a falha em vez de chutar um valor.
export async function getMyEmailNotices(profileId: string): Promise<boolean | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("profiles").select("email_notices").eq("id", profileId).maybeSingle();
  if (error || !data) return null;
  return data.email_notices;
}

export async function setMyEmailNotices(enabled: boolean): Promise<"ok" | "failed"> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("set_my_email_notices", { p_enabled: enabled });
  if (error) {
    console.error("Falha ao mudar a preferência de avisos:", error.code);
    return "failed";
  }
  return "ok";
}
