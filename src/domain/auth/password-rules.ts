// Regras da senha que a pessoa define pelo convite. Roda no navegador (feedback na hora) e no servidor (valor final).
// Sem exigir maiúscula, número ou símbolo: o que protege de verdade é o tamanho. O teto de 72 bytes existe porque o
// Supabase (bcrypt) ignora o que passa disso; melhor avisar do que aceitar uma senha que valeria só em parte.

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_BYTES = 72;

export type PasswordProblem = "too_short" | "too_long" | "blank";
export type PasswordConfirmationProblem = "mismatch";

export interface PasswordCheck {
  password: PasswordProblem | null;
  confirmation: PasswordConfirmationProblem | null;
}

export const PASSWORD_MESSAGES: Record<PasswordProblem | PasswordConfirmationProblem, string> = {
  too_short: `A senha precisa ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`,
  too_long: "A senha é longa demais. Use até 72 caracteres.",
  blank: "A senha não pode ser só de espaços.",
  mismatch: "As senhas não são iguais.",
};

export function validatePassword(password: string, confirmation: string): PasswordCheck {
  let problem: PasswordProblem | null = null;
  if (password.trim().length === 0 && password.length > 0) problem = "blank";
  else if ([...password].length < PASSWORD_MIN_LENGTH) problem = "too_short";
  else if (new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES) problem = "too_long";

  return { password: problem, confirmation: password === confirmation ? null : "mismatch" };
}

export function isPasswordValid(check: PasswordCheck): boolean {
  return check.password === null && check.confirmation === null;
}
