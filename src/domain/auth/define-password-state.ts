import type { PasswordCheck } from "./password-rules";

// Fica fora da Server Action porque um arquivo "use server" só pode exportar funções assíncronas.
// Por que o formulário não deu certo. A tela escolhe o texto de cada um; nunca devolvemos o erro bruto do Supabase.
export type DefinePasswordState =
  | { status: "idle" }
  | { status: "invalid_fields"; check: PasswordCheck }
  | { status: "link_invalid" } // link expirado, já usado ou malformado (o Supabase não diferencia expirado de usado)
  | { status: "inactive" } // convite válido, mas o perfil está inativo
  | { status: "rate_limited"; message: string }
  | { status: "failed" } // erro nosso ou do Supabase; a pessoa pode tentar de novo
  | { status: "failed_after_use" }; // o link foi gasto, mas a senha não foi salva: precisa de novo convite

export const INITIAL_DEFINE_PASSWORD_STATE: DefinePasswordState = { status: "idle" };
