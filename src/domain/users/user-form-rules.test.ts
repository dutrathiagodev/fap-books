import { describe, expect, it } from "vitest";
import {
  EMPTY_USER_FORM,
  fieldsFor,
  normalizeEmail,
  normalizePhone,
  parseUserForm,
  toProfileRow,
  userFormErrors,
  type UserFormValues,
} from "./user-form-rules";

const student: UserFormValues = {
  ...EMPTY_USER_FORM,
  role: "student",
  fullName: "Maria Souza",
  email: "maria@exemplo.com",
  registration: "242802",
  course: "ADS",
};
const teacher: UserFormValues = { ...EMPTY_USER_FORM, role: "teacher", fullName: "João Lima", email: "joao@exemplo.com" };
const librarian: UserFormValues = {
  ...EMPTY_USER_FORM,
  role: "librarian",
  fullName: "Ana Paula",
  email: "ana@exemplo.com",
  jobTitle: "Chefe da biblioteca",
};

describe("userFormErrors", () => {
  it("aceita aluno, professor e funcionário completos", () => {
    expect(userFormErrors(student)).toEqual({});
    expect(userFormErrors(teacher)).toEqual({});
    expect(userFormErrors(librarian)).toEqual({});
  });

  it("exige perfil", () => {
    expect(userFormErrors({ ...student, role: "" }).role).toBeDefined();
  });

  it("exige nome e e-mail válidos", () => {
    const errors = userFormErrors({ ...teacher, fullName: " ", email: "sem-arroba" });
    expect(errors.fullName).toBeDefined();
    expect(errors.email).toBeDefined();
    expect(userFormErrors({ ...teacher, fullName: "x".repeat(121) }).fullName).toBeDefined();
    expect(userFormErrors({ ...teacher, email: "a b@c.com" }).email).toBeDefined();
  });

  it("matrícula do aluno: obrigatória e de 5 a 8 números", () => {
    expect(userFormErrors({ ...student, registration: "" }).registration).toBeDefined();
    expect(userFormErrors({ ...student, registration: "1234" }).registration).toBeDefined();
    expect(userFormErrors({ ...student, registration: "123456789" }).registration).toBeDefined();
    expect(userFormErrors({ ...student, registration: "24A802" }).registration).toBeDefined();
    expect(userFormErrors({ ...student, registration: "12345" }).registration).toBeUndefined();
    expect(userFormErrors({ ...student, registration: "12345678" }).registration).toBeUndefined();
  });

  it("curso do aluno é obrigatório", () => {
    expect(userFormErrors({ ...student, course: " " }).course).toBeDefined();
  });

  it("cargo do funcionário é obrigatório", () => {
    expect(userFormErrors({ ...librarian, jobTitle: "" }).jobTitle).toBeDefined();
  });

  it("professor não precisa de matrícula, curso nem cargo", () => {
    const errors = userFormErrors(teacher);
    expect(errors.registration).toBeUndefined();
    expect(errors.course).toBeUndefined();
    expect(errors.jobTitle).toBeUndefined();
  });

  it("telefone é opcional, mas com DDD quando preenchido", () => {
    expect(userFormErrors({ ...teacher, phone: "" }).phone).toBeUndefined();
    expect(userFormErrors({ ...teacher, phone: "(11) 98765-4321" }).phone).toBeUndefined();
    expect(userFormErrors({ ...teacher, phone: "+55 11 3456-7890" }).phone).toBeUndefined();
    expect(userFormErrors({ ...teacher, phone: "98765" }).phone).toBeDefined();
  });
});

describe("normalizações", () => {
  it("telefone fica só com números e sem o código do Brasil", () => {
    expect(normalizePhone("(11) 98765-4321")).toBe("11987654321");
    expect(normalizePhone("+55 11 98765-4321")).toBe("11987654321");
  });
  it("e-mail em minúsculas e sem espaços nas pontas", () => {
    expect(normalizeEmail("  Maria@Exemplo.COM ")).toBe("maria@exemplo.com");
  });
});

describe("fieldsFor", () => {
  it("cada perfil usa os próprios campos", () => {
    expect(fieldsFor("student")).toContain("registration");
    expect(fieldsFor("student")).not.toContain("jobTitle");
    expect(fieldsFor("librarian")).toContain("jobTitle");
    expect(fieldsFor("librarian")).not.toContain("registration");
    expect(fieldsFor("teacher")).toEqual(["fullName", "email", "phone"]);
  });
});

describe("parseUserForm", () => {
  it("aceita o objeto completo", () => {
    expect(parseUserForm(student)).toEqual(student);
  });
  it("recusa o que não é objeto, campo que não é texto ou perfil desconhecido", () => {
    expect(parseUserForm(null)).toBeNull();
    expect(parseUserForm("x")).toBeNull();
    expect(parseUserForm({ ...student, phone: 5 })).toBeNull();
    expect(parseUserForm({ ...student, role: "admin" })).toBeNull();
    const { course, ...missing } = student;
    void course;
    expect(parseUserForm(missing)).toBeNull();
  });
});

describe("toProfileRow", () => {
  it("aluno leva matrícula e curso, sem cargo", () => {
    expect(toProfileRow({ ...student, role: "student", phone: "(11) 98765-4321" })).toEqual({
      role: "student",
      full_name: "Maria Souza",
      phone: "11987654321",
      registration: "242802",
      course: "ADS",
      job_title: null,
    });
  });
  it("funcionário leva cargo, sem matrícula nem curso, mesmo que venham preenchidos", () => {
    const row = toProfileRow({ ...librarian, role: "librarian", registration: "242802", course: "ADS" });
    expect(row.job_title).toBe("Chefe da biblioteca");
    expect(row.registration).toBeNull();
    expect(row.course).toBeNull();
  });
  it("professor não leva nenhum campo extra", () => {
    const row = toProfileRow({ ...teacher, role: "teacher", jobTitle: "Chefe", registration: "12345" });
    expect(row).toMatchObject({ registration: null, course: null, job_title: null, phone: null });
  });
});
