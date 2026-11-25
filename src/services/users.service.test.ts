import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserFormValues } from "@/domain/users/user-form-rules";

// Cadastro de usuário (cards 0029 a 0031): e-mail já cadastrado, mesmo sem confirmação, deve ser recusado ANTES de
// convidar. O convite do Supabase só devolve "email_exists" para conta confirmada; para conta pendente ele reenvia o
// convite, e o perfil da pessoa seria sobrescrito (nome e matrícula).
const profilesByRegistration = vi.fn();
const profilesByEmail = vi.fn();
const profileUpdate = vi.fn();
const auditInsert = vi.fn();
const invite = vi.fn();
const deleteUser = vi.fn();

const eq = vi.fn((column: string) => ({ maybeSingle: column === "email" ? profilesByEmail : profilesByRegistration }));

const from = vi.fn((table: string) => {
  if (table === "audit_logs") return { insert: auditInsert };
  return {
    select: () => ({ eq }),
    update: () => ({ eq: () => ({ select: profileUpdate }) }),
  };
});

vi.mock("@/lib/supabase/server-client", () => ({ createSupabaseServerClient: async () => ({ from }) }));
vi.mock("@/lib/supabase/admin-client", () => ({
  createSupabaseAdminClient: () => ({ auth: { admin: { inviteUserByEmail: invite, deleteUser } } }),
}));
vi.mock("@/lib/site-url", () => ({ getInviteRedirectUrl: () => "http://localhost:3000/definir-senha" }));

const { createUser } = await import("./users.service");

const values = {
  email: "  Maria@Exemplo.com ",
  fullName: "Maria Souza",
  phone: "",
  registration: "A-100",
  course: "Teologia",
  jobTitle: "",
  role: "student",
} as unknown as UserFormValues & { role: "student" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  profilesByRegistration.mockResolvedValue({ data: null, error: null });
  profilesByEmail.mockResolvedValue({ data: null, error: null });
  invite.mockResolvedValue({ data: { user: { id: "u-1" } }, error: null });
  profileUpdate.mockResolvedValue({ data: [{ id: "u-1" }], error: null });
  auditInsert.mockResolvedValue({ error: null });
  deleteUser.mockResolvedValue({ error: null });
});

describe("createUser: e-mail já cadastrado", () => {
  it("recusa e não convida nem altera o perfil quando já existe perfil com o e-mail (conta pendente ou não)", async () => {
    profilesByEmail.mockResolvedValue({ data: { id: "existente" }, error: null });

    await expect(createUser(values, "func-1")).resolves.toEqual({ ok: false, reason: "duplicate_email" });

    expect(invite).not.toHaveBeenCalled();
    expect(profileUpdate).not.toHaveBeenCalled();
    expect(auditInsert).not.toHaveBeenCalled();
  });

  it("procura o e-mail já normalizado (minúsculas, sem espaços)", async () => {
    profilesByEmail.mockResolvedValue({ data: { id: "existente" }, error: null });
    await createUser(values, "func-1");
    expect(eq).toHaveBeenCalledWith("email", "maria@exemplo.com");
  });

  it("falha com erro genérico se a consulta do e-mail falhar, sem convidar", async () => {
    profilesByEmail.mockResolvedValue({ data: null, error: { code: "XX000" } });
    await expect(createUser(values, "func-1")).resolves.toEqual({ ok: false, reason: "error" });
    expect(invite).not.toHaveBeenCalled();
  });

  it("continua aceitando um e-mail novo", async () => {
    await expect(createUser(values, "func-1")).resolves.toEqual({ ok: true });
    expect(invite).toHaveBeenCalledWith("maria@exemplo.com", expect.objectContaining({ data: { full_name: "Maria Souza" } }));
  });

  it("continua recusando matrícula repetida", async () => {
    profilesByRegistration.mockResolvedValue({ data: { id: "outro" }, error: null });
    await expect(createUser(values, "func-1")).resolves.toEqual({ ok: false, reason: "duplicate_registration" });
    expect(invite).not.toHaveBeenCalled();
  });
});
