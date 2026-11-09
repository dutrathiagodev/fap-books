import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { UserView } from "../types/user-admin";
import { UserActiveModal } from "./UserActiveModal";
import { UserEditModal } from "./UserEditModal";
import { UserRoleBadge, UserStatusBadge } from "./UserBadges";
import { UsersTable } from "./UsersTable";

const base: UserView = {
  id: "u1",
  fullName: "Ana Beatriz Souza",
  initials: "AS",
  email: "ana@aluno.fap.edu.br",
  role: "student",
  roleLabel: "Aluno",
  detail: "242802",
  active: true,
  openLoans: 2,
  phone: "41988887777",
  registration: "242802",
  course: "ADS",
  jobTitle: "",
  graduating: false,
  isSelf: false,
};
const inactive: UserView = { ...base, id: "u2", fullName: "João Pedro Alves", active: false, openLoans: 0 };
const self: UserView = { ...base, id: "u3", fullName: "Maria Santos", role: "librarian", roleLabel: "Funcionário da biblioteca", isSelf: true };
const noop = () => {};

const html = (element: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(element);

describe("UserStatusBadge e UserRoleBadge", () => {
  it("Ativo é verde e Inativo é cinza, os dois com ícone e texto", () => {
    const active = html(createElement(UserStatusBadge, { active: true }));
    const off = html(createElement(UserStatusBadge, { active: false }));
    expect(active).toContain("Ativo");
    expect(active).toContain("text-success-700");
    expect(active).toContain("dark:text-green-300");
    expect(off).toContain("Inativo");
    expect(off).toContain("text-ink-muted");
    expect(active).toContain("<svg");
    expect(off).toContain("<svg");
  });

  it("o perfil aparece sempre em texto", () => {
    expect(html(createElement(UserRoleBadge, { role: "teacher", label: "Professor" }))).toContain("Professor");
  });
});

describe("UsersTable", () => {
  const markup = html(createElement(UsersTable, { users: [base, inactive, self], onEdit: noop, onToggleActive: noop }));

  it("mostra nome, e-mail, perfil, matrícula e empréstimos", () => {
    expect(markup).toContain("Ana Beatriz Souza");
    expect(markup).toContain("ana@aluno.fap.edu.br");
    expect(markup).toContain("242802");
    for (const header of ["Nome", "Perfil", "Status", "Empréstimos", "Ações"]) expect(markup).toContain(header);
  });

  it("ativo oferece Inativar; inativo oferece Reativar", () => {
    expect(markup).toContain('aria-label="Inativar Ana Beatriz Souza"');
    expect(markup).toContain('aria-label="Reativar João Pedro Alves"');
    expect(markup).not.toContain('aria-label="Inativar João Pedro Alves"');
  });

  it("a própria funcionária só tem Editar (não se inativa) e aparece como (você)", () => {
    expect(markup).toContain('aria-label="Editar Maria Santos"');
    expect(markup).not.toContain('aria-label="Inativar Maria Santos"');
    expect(markup).not.toContain('aria-label="Reativar Maria Santos"');
    expect(markup).toContain("(você)");
  });

  it("desliga os botões enquanto uma ação roda", () => {
    const busy = html(createElement(UsersTable, { users: [base], onEdit: noop, onToggleActive: noop, disabled: true }));
    expect(busy.match(/disabled=""/g)?.length).toBeGreaterThanOrEqual(2);
  });
});

describe("UserEditModal", () => {
  it("fechado não desenha nada", () => {
    expect(html(createElement(UserEditModal, { user: null, onSave: noop, onClose: noop }))).toBe("");
  });

  it("aluno: e-mail só como texto (não é campo), matrícula, curso e formando", () => {
    const markup = html(createElement(UserEditModal, { user: base, onSave: noop, onClose: noop }));
    expect(markup).toContain("Editar usuário");
    expect(markup).toContain("ana@aluno.fap.edu.br");
    expect(markup).not.toContain('name="email"');
    expect(markup).toContain("Matrícula (RA)");
    expect(markup).toContain("Curso");
    expect(markup).toContain("Formando");
    expect(markup).not.toContain("Cargo");
  });

  it("funcionário: cargo, sem matrícula nem formando", () => {
    const markup = html(createElement(UserEditModal, { user: { ...self, isSelf: false }, onSave: noop, onClose: noop }));
    expect(markup).toContain("Cargo");
    expect(markup).not.toContain("Matrícula (RA)");
    expect(markup).not.toContain("Formando");
  });

  it("a própria funcionária não muda o próprio perfil", () => {
    const markup = html(createElement(UserEditModal, { user: self, onSave: noop, onClose: noop }));
    expect(markup).toContain("Você não pode mudar o seu próprio perfil.");
    expect(markup).toContain("<fieldset disabled");
  });

  it("mostra o erro do servidor e trava o botão enquanto salva", () => {
    const markup = html(createElement(UserEditModal, { user: base, pending: true, error: "Já existe um usuário com essa matrícula.", onSave: noop, onClose: noop }));
    expect(markup).toContain("Já existe um usuário com essa matrícula.");
    expect(markup).toContain("Salvando…");
  });
});

describe("UserActiveModal", () => {
  it("inativar: texto do Figma e botão de perigo", () => {
    const markup = html(createElement(UserActiveModal, { user: { ...base, openLoans: 0 }, onConfirm: noop, onClose: noop }));
    expect(markup).toContain("Inativar usuário?");
    expect(markup).toContain("Inativar impede novos empréstimos e mantém o histórico.");
    expect(markup).toContain("border-danger-700");
    expect(markup).not.toContain("empréstimo em aberto");
  });

  it("com empréstimo em aberto, avisa e o botão só liga depois de confirmar", () => {
    const markup = html(createElement(UserActiveModal, { user: base, onConfirm: noop, onClose: noop }));
    expect(markup).toContain("2 empréstimos em aberto");
    expect(markup).toContain("Entendo");
    expect(markup).toMatch(/<button[^>]*disabled[^>]*>Inativar usuário/);
  });

  it("aviso vindo do servidor aparece mesmo sem empréstimo na lista", () => {
    const markup = html(createElement(UserActiveModal, { user: { ...base, openLoans: 0 }, forceOpenLoansWarning: true, onConfirm: noop, onClose: noop }));
    expect(markup).toContain("empréstimo em aberto");
  });

  it("reativar não pede confirmação de empréstimo", () => {
    const markup = html(createElement(UserActiveModal, { user: inactive, onConfirm: noop, onClose: noop }));
    expect(markup).toContain("Reativar usuário?");
    expect(markup).not.toContain("Entendo");
  });

  it("mostra erro e fica fechado sem usuário", () => {
    expect(html(createElement(UserActiveModal, { user: null, onConfirm: noop, onClose: noop }))).toBe("");
    expect(html(createElement(UserActiveModal, { user: inactive, error: "Falhou.", onConfirm: noop, onClose: noop }))).toContain("Falhou.");
  });
});
