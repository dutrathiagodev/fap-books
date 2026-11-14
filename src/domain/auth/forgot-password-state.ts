// Fica fora da Server Action porque um arquivo "use server" só pode exportar funções assíncronas.
// Resultado do pedido "Esqueci minha senha". A tela escolhe o texto de cada um; nunca devolvemos o erro bruto do Supabase.
export type ForgotPasswordState =
  | { status: "idle" }
  | { status: "invalid_email" }
  // Resposta NEUTRA: vale para e-mail com conta, sem conta, inativo ou barrado pelo Supabase. Nunca diz se a conta existe.
  | { status: "sent" }
  | { status: "rate_limited"; message: string }
  | { status: "failed" }; // erro nosso ou do Supabase (rede, 5xx); a pessoa pode tentar de novo

export const INITIAL_FORGOT_PASSWORD_STATE: ForgotPasswordState = { status: "idle" };
