"use client";

import { useState } from "react";
import { BookOpen, Home, LogOut, Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { logout } from "@/app/actions/auth";
import type { Profile, UserRole } from "@/types/profile";
import { Logo } from "./Logo";

interface AppShellProps {
  profile: Profile;
  title: string;
  children: React.ReactNode;
}

const ROLE_LABEL: Record<UserRole, string> = {
  student: "Aluno",
  teacher: "Professor",
  librarian: "Funcionário",
};

const HOME_PATH: Record<UserRole, string> = {
  student: "/aluno",
  teacher: "/professor",
  librarian: "/funcionario",
};

// Cada tela nova entra aqui quando o card dela for entregue.
function navItems(role: UserRole) {
  return [{ label: "Início", href: HOME_PATH[role], icon: Home }];
}

// Estrutura base das telas logadas: menu lateral recolhível no computador e menu em gaveta no celular.
export function AppShell({ profile, title, children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState(false);
  const items = navItems(profile.role);

  const menu = (wide: boolean) => (
    <nav aria-label="Menu principal" className="flex flex-1 flex-col gap-1 px-3 py-4">
      {items.map(({ label, href, icon: Icon }) => (
        <a
          key={href}
          href={href}
          aria-current="page"
          className="flex items-center gap-3 rounded-md bg-selected px-3 py-2 text-sm font-medium text-brand"
        >
          <Icon size={20} aria-hidden />
          {wide && <span>{label}</span>}
        </a>
      ))}
    </nav>
  );

  const footer = (wide: boolean) => (
    <div className="border-t border-line p-3">
      <div className="flex items-center gap-3 px-1 pb-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-medium text-on-brand">
          {profile.fullName.charAt(0).toUpperCase()}
        </span>
        {wide && (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{profile.fullName}</p>
            <p className="text-xs text-ink-muted">{ROLE_LABEL[profile.role]}</p>
          </div>
        )}
      </div>
      <form action={logout}>
        <button
          type="submit"
          className="flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-ink-muted hover:bg-subtle"
        >
          <LogOut size={20} aria-hidden />
          {wide && <span>Sair</span>}
        </button>
      </form>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-1">
      {/* Menu lateral (computador) */}
      <aside
        className={`hidden shrink-0 flex-col border-r border-line bg-surface transition-[width] md:flex ${
          collapsed ? "w-[68px]" : "w-64"
        }`}
      >
        <div className="flex h-16 items-center justify-center border-b border-line px-3">
          {collapsed ? <BookOpen size={24} className="text-brand" aria-hidden /> : <Logo width={96} />}
        </div>
        {menu(!collapsed)}
        {footer(!collapsed)}
      </aside>

      {/* Menu em gaveta (celular) */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-default bg-ink/40"
          />
          <aside className="relative flex h-full w-64 flex-col bg-surface shadow-lg">
            <div className="flex h-16 items-center justify-between border-b border-line px-4">
              <Logo width={96} />
              <button
                type="button"
                aria-label="Fechar menu"
                onClick={() => setOpen(false)}
                className="cursor-pointer rounded-md p-2 hover:bg-subtle"
              >
                <X size={20} aria-hidden />
              </button>
            </div>
            {menu(true)}
            {footer(true)}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center gap-3 border-b border-line bg-surface px-4 md:px-6">
          <button
            type="button"
            aria-label="Abrir menu"
            onClick={() => setOpen(true)}
            className="cursor-pointer rounded-md p-2 hover:bg-subtle md:hidden"
          >
            <Menu size={20} aria-hidden />
          </button>
          <button
            type="button"
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            onClick={() => setCollapsed((v) => !v)}
            className="hidden cursor-pointer rounded-md p-2 hover:bg-subtle md:block"
          >
            {collapsed ? <PanelLeftOpen size={20} aria-hidden /> : <PanelLeftClose size={20} aria-hidden />}
          </button>
          <span className="text-sm text-ink-muted">{ROLE_LABEL[profile.role]}</span>
          <span className="text-sm text-ink-muted" aria-hidden>
            /
          </span>
          <span className="truncate text-sm font-medium">{title}</span>
        </header>
        <main className="flex-1 bg-page p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
