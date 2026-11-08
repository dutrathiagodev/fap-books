import type { UserRole } from "@/types/profile";

// Cadastro de usuários da bibliotecária (cards 0029, 0030, 0031; frame 0121). Regras puras: o navegador usa para avisar
// cedo e o servidor usa de novo, porque o que chega a uma Server Action nunca é confiável.

export const USERS_PATH = "/funcionario/usuarios";
export const USER_CREATE_PATH = `${USERS_PATH}/novo`;

export const USER_ROLES: readonly UserRole[] = ["student", "teacher", "librarian"];

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  student: "Aluno",
  teacher: "Professor",
  librarian: "Funcionário da biblioteca",
};

// Cartões do seletor de perfil (frame 0121): nome e subtítulo de cada opção.
export const USER_ROLE_CARDS: Record<UserRole, { title: string; subtitle: string }> = {
  student: { title: "Aluno FAP", subtitle: "Graduação e pós" },
  teacher: { title: "Docente / Pesquisador", subtitle: "Corpo acadêmico" },
  librarian: { title: "Equipe da biblioteca", subtitle: "Operacional e balcão" },
};

export interface GuidelineItem {
  label: string;
  value: string;
}

// "Diretrizes do perfil" do painel lateral (frame 0121). Cada perfil recebe as regras do próprio perfil.
// O limite de 4 livros dos formandos é decidido no balcão (coluna profiles.graduating, outra frente), não nesta tela.
export function guidelineItems(role: UserRole): GuidelineItem[] {
  if (role === "librarian") {
    return [
      { label: "Acesso", value: "Acervo, usuários e empréstimos" },
      { label: "Cargo", value: "Obrigatório (ex.: chefe, auxiliar)" },
    ];
  }
  return [
    { label: "Limite de empréstimos", value: "3 livros (4 para formandos)" },
    { label: "Prazo regular", value: "7 dias" },
    { label: "Política de multa", value: "R$ 1,00 por dia de atraso" },
    { label: "Bloqueio automático", value: "Com multa em aberto, novos empréstimos ficam bloqueados" },
    { label: "Reserva pedagógica", value: role === "teacher" ? "Disponível" : "Somente docente" },
  ];
}

export interface UserFormValues {
  role: UserRole | "";
  fullName: string;
  email: string;
  phone: string;
  registration: string;
  course: string;
  jobTitle: string;
}

export type UserFormField = keyof UserFormValues;
export type UserFormErrors = Partial<Record<UserFormField, string>>;

export const EMPTY_USER_FORM: UserFormValues = {
  role: "student",
  fullName: "",
  email: "",
  phone: "",
  registration: "",
  course: "",
  jobTitle: "",
};

// Mensagens do resultado da gravação, iguais no navegador e no servidor.
export const USER_FORM_MESSAGES = {
  invalid: "Confira os campos destacados.",
  duplicate_email: "Já existe um usuário com esse e-mail.",
  duplicate_registration: "Já existe um usuário com essa matrícula.",
  rate_limit: "O limite de convites por e-mail foi atingido. Aguarde cerca de uma hora e tente de novo.",
  error: "Não foi possível cadastrar o usuário. Tente novamente.",
} as const;

export type UserFormFailure = keyof typeof USER_FORM_MESSAGES;

export type UserCreateResult =
  | { ok: true }
  | { ok: false; reason: "invalid"; errors: UserFormErrors }
  | { ok: false; reason: Exclude<UserFormFailure, "invalid"> };

const LIMIT = { fullName: 120, email: 254, course: 80, jobTitle: 80 } as const;

// Matrícula = RA da FAP: só números, de 5 a 8 (mesma regra do banco, migration 20261105022755).
const REGISTRATION = /^[0-9]{5,8}$/;
// Confere o formato básico (algo@dominio.tld, sem espaço). Quem de fato confirma o e-mail é o convite enviado.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && (USER_ROLES as readonly string[]).includes(value);
}

// Só os números do telefone; tira o código do Brasil (55) quando a pessoa digita +55.
export function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.length > 11 && digits.startsWith("55") ? digits.slice(2) : digits;
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

// Campos que cada perfil usa. O que não pertence ao perfil escolhido é ignorado (e nunca gravado).
export function fieldsFor(role: UserRole): UserFormField[] {
  const common: UserFormField[] = ["fullName", "email", "phone"];
  if (role === "student") return [...common, "registration", "course"];
  if (role === "librarian") return [...common, "jobTitle"];
  return common;
}

export function userFormErrors(values: UserFormValues): UserFormErrors {
  const errors: UserFormErrors = {};

  if (!isUserRole(values.role)) {
    errors.role = "Selecione o perfil.";
    return errors;
  }

  const fullName = values.fullName.trim();
  if (!fullName) errors.fullName = "Informe o nome completo.";
  else if (fullName.length < 3) errors.fullName = "Informe o nome completo.";
  else if (fullName.length > LIMIT.fullName) errors.fullName = "O nome é longo demais.";

  const email = normalizeEmail(values.email);
  if (!email) errors.email = "Informe o e-mail.";
  else if (email.length > LIMIT.email || !EMAIL.test(email)) errors.email = "Informe um e-mail válido.";

  if (values.phone.trim()) {
    const phone = normalizePhone(values.phone);
    if (phone.length < 10 || phone.length > 11) errors.phone = "Use o telefone com DDD, ex.: (11) 98765-4321.";
  }

  if (values.role === "student") {
    if (!values.registration.trim()) errors.registration = "Informe a matrícula (RA).";
    else if (!REGISTRATION.test(values.registration.trim())) errors.registration = "A matrícula tem de 5 a 8 números.";

    const course = values.course.trim();
    if (!course) errors.course = "Informe o curso.";
    else if (course.length < 2 || course.length > LIMIT.course) errors.course = "Informe o curso (até 80 caracteres).";
  }

  if (values.role === "librarian") {
    const jobTitle = values.jobTitle.trim();
    if (!jobTitle) errors.jobTitle = "Informe o cargo.";
    else if (jobTitle.length < 2 || jobTitle.length > LIMIT.jobTitle) errors.jobTitle = "Informe o cargo (até 80 caracteres).";
  }

  return errors;
}

// O que chega à Server Action é qualquer coisa: só segue se todos os campos forem texto (e o perfil for um dos três).
export function parseUserForm(input: unknown): (UserFormValues & { role: UserRole }) | null {
  if (typeof input !== "object" || input === null) return null;
  const record = input as Record<string, unknown>;
  const fields = Object.keys(EMPTY_USER_FORM) as UserFormField[];
  const values = {} as Record<UserFormField, string>;
  for (const field of fields) {
    const value = record[field];
    if (typeof value !== "string") return null;
    values[field] = value;
  }
  const role = values.role;
  if (!isUserRole(role)) return null;
  return { ...values, role };
}

// Linha de profiles pronta para gravar: só os campos do perfil escolhido, já limpos (valores vazios viram null).
export interface ProfileRegistrationRow {
  role: UserRole;
  full_name: string;
  phone: string | null;
  registration: string | null;
  course: string | null;
  job_title: string | null;
}

export function toProfileRow(values: UserFormValues & { role: UserRole }): ProfileRegistrationRow {
  const phone = normalizePhone(values.phone);
  return {
    role: values.role,
    full_name: values.fullName.trim(),
    phone: phone || null,
    registration: values.role === "student" ? values.registration.trim() : null,
    course: values.role === "student" ? values.course.trim() : null,
    job_title: values.role === "librarian" ? values.jobTitle.trim() : null,
  };
}
