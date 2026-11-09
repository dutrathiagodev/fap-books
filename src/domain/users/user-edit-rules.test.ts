import { describe, expect, it } from "vitest";
import type { UserView } from "../../types/user-admin";
import { editValuesOf, parseUserEdit, toUpdateArgs, userEditErrors, validUserActionIds, type UserEditValues } from "./user-edit-rules";
import { toUserView, type UserRow } from "./user-views";

const row: UserRow = {
  id: "11111111-1111-4111-8111-111111111111",
  full_name: "Ana Beatriz Souza",
  email: "ana@aluno.fap.edu.br",
  role: "student",
  active: true,
  phone: "41988887777",
  registration: "242802",
  course: "ADS",
  job_title: null,
  graduating: true,
};
const student: UserEditValues = editValuesOf(toUserView(row, 2, "outro"));
const KEY = "22222222-2222-4222-8222-222222222222";

describe("toUserView", () => {
  it("monta a linha: iniciais, rótulo, matrícula como detalhe e empréstimos", () => {
    const view: UserView = toUserView(row, 2, "outro");
    expect(view).toMatchObject({ initials: "AS", roleLabel: "Aluno", detail: "242802", openLoans: 2, isSelf: false, graduating: true });
  });

  it("funcionário mostra o cargo; professor não tem detalhe; campos nulos viram texto vazio", () => {
    expect(toUserView({ ...row, role: "librarian", job_title: "Auxiliar", registration: null }, 0, "x").detail).toBe("Auxiliar");
    const teacher = toUserView({ ...row, role: "teacher", registration: null, course: null, phone: null }, 0, "x");
    expect(teacher.detail).toBeNull();
    expect(teacher).toMatchObject({ phone: "", course: "", registration: "" });
  });

  it("marca a própria funcionária", () => {
    expect(toUserView(row, 0, row.id).isSelf).toBe(true);
  });
});

describe("userEditErrors", () => {
  it("dados certos: sem erro (o e-mail não faz parte da edição)", () => {
    expect(userEditErrors(student)).toEqual({});
  });

  it("aluno exige matrícula de 5 a 8 números e curso", () => {
    expect(userEditErrors({ ...student, registration: "" }).registration).toBeTruthy();
    expect(userEditErrors({ ...student, registration: "12ab" }).registration).toBeTruthy();
    expect(userEditErrors({ ...student, course: "" }).course).toBeTruthy();
  });

  it("professor não precisa de matrícula nem de curso; funcionário exige cargo", () => {
    expect(userEditErrors({ ...student, role: "teacher", registration: "", course: "" })).toEqual({});
    expect(userEditErrors({ ...student, role: "librarian", jobTitle: "" }).jobTitle).toBeTruthy();
  });

  it("nome curto e telefone sem DDD são recusados", () => {
    expect(userEditErrors({ ...student, fullName: "Al" }).fullName).toBeTruthy();
    expect(userEditErrors({ ...student, phone: "9999" }).phone).toBeTruthy();
    expect(userEditErrors({ ...student, phone: "" })).toEqual({});
  });
});

describe("parseUserEdit", () => {
  it("aceita o formato certo", () => {
    expect(parseUserEdit(student)).toEqual(student);
  });

  it.each([
    [null],
    ["texto"],
    [{ ...student, role: "admin" }],
    [{ ...student, fullName: 12 }],
    [{ ...student, graduating: "sim" }],
    [{ ...student, jobTitle: undefined }],
  ])("recusa entrada malformada %#", (input) => {
    expect(parseUserEdit(input)).toBeNull();
  });

  it("ignora campos extras (ex.: e-mail ou situação), que nunca chegam ao banco", () => {
    const parsed = parseUserEdit({ ...student, email: "novo@x.com", active: false });
    expect(parsed).toEqual(student);
  });
});

describe("toUpdateArgs", () => {
  it("limpa os textos, tira a máscara do telefone e manda nulo no que está vazio", () => {
    const args = toUpdateArgs(row.id, { ...student, fullName: "  Ana  ", phone: "(41) 98888-7777", jobTitle: " " }, KEY);
    expect(args).toMatchObject({
      p_profile_id: row.id,
      p_full_name: "Ana",
      p_phone: "41988887777",
      p_job_title: null,
      p_idempotency_key: KEY,
    });
  });

  it("formando só vale para aluno", () => {
    expect(toUpdateArgs(row.id, student, KEY).p_graduating).toBe(true);
    expect(toUpdateArgs(row.id, { ...student, role: "teacher" }, KEY).p_graduating).toBe(false);
  });
});

describe("validUserActionIds", () => {
  it("só uuid de verdade", () => {
    expect(validUserActionIds(row.id, KEY)).toBe(true);
    expect(validUserActionIds("1; drop", KEY)).toBe(false);
    expect(validUserActionIds(row.id, 5)).toBe(false);
  });
});
