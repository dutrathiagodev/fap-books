"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  Bell,
  Bookmark,
  ChartColumn,
  ChevronDown,
  GraduationCap,
  History,
  Home,
  Library,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  Search,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { logout } from "@/app/actions/auth";
import { ACERVO_PATH, ROLE_LABELS } from "@/domain/access/access-rules";
import { PANEL_PATH } from "@/domain/navigation/nav-items";
import { isActive, navItemsFor, type NavItem } from "@/domain/navigation/nav-items";
import type { Profile, UserRole } from "@/types/profile";
import { HelpAssistant } from "./HelpAssistant";
import { Logo } from "./Logo";

interface AppShellProps {
  profile: Profile;
  // Avisos de prazo não lidos (o card 0147 liga isto aos dados). Sem valor, o sino aparece sem contador.
  noticeCount?: number;
  children: React.ReactNode;
}

function iconFor(item: NavItem, role: UserRole): LucideIcon {
  switch (item.key) {
    case "home":
      return role === "librarian" ? LayoutDashboard : Home;
    case "books":
      return role === "librarian" ? Library : Search;
    case "loans":
      return ArrowLeftRight;
    case "reservations":
      return Bookmark;
    case "pedagogical":
      return GraduationCap;
    case "fines":
      return Receipt;
    case "users":
      return Users;
    case "history":
      return History;
    case "reports":
      return ChartColumn;
  }
}

const ITEM_BASE =
  "relative flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-white outline-offset-2 focus-visible:outline-2 focus-visible:outline-white";

function MenuList({
  items,
  role,
  pathname,
  wide,
  onNavigate,
}: {
  items: NavItem[];
  role: UserRole;
  pathname: string;
  wide: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Menu principal" className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
      {items.map((item, index) => {
        const Icon = iconFor(item, role);
        // Rótulo do grupo (OPERAÇÃO, GESTÃO) quando começa um grupo novo; recolhido, vira só uma linha de separação.
        const startsGroup = item.group !== undefined && item.group !== items[index - 1]?.group;
        const groupHeader = startsGroup ? (
          wide ? (
            <p key={`group-${item.group}`} className={`px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-navy-200 ${index === 0 ? "" : "pt-4"}`}>
              {item.group}
            </p>
          ) : index > 0 ? (
            <div key={`group-${item.group}`} aria-hidden className="mx-2 my-2 border-t border-white/10" />
          ) : null
        ) : null;
        const content = (
          <>
            <Icon size={20} aria-hidden className="shrink-0" />
            {wide ? <span className="truncate">{item.label}</span> : <span className="sr-only">{item.label}</span>}
          </>
        );

        if (!item.href) {
          return (
            <Fragment key={item.key}>
              {groupHeader}
              <span aria-disabled="true" title="Em breve" className={`${ITEM_BASE} cursor-not-allowed opacity-50`}>
                {content}
              </span>
            </Fragment>
          );
        }

        const active = isActive(item, pathname);
        return (
          <Fragment key={item.key}>
            {groupHeader}
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              onClick={onNavigate}
              className={`${ITEM_BASE} hover:bg-navy-800/70 ${active ? "bg-navy-800" : ""}`}
            >
              {active && <span aria-hidden className="absolute inset-y-2 left-0 w-1 rounded-r bg-navy-200" />}
              {content}
            </Link>
          </Fragment>
        );
      })}
    </nav>
  );
}

// Iniciais do nome para o avatar (ex.: "Maria Santos" vira "MS").
function initialsOf(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

// Quem está logado e o botão de sair, no rodapé do menu lateral (Figma, menu lateral).
function SidebarUser({ profile, wide }: { profile: Profile; wide: boolean }) {
  return (
    <div
      className={`mx-3 mb-4 flex items-center gap-3 rounded-lg bg-navy-800/60 p-2 ${wide ? "" : "flex-col"}`}
    >
      <span
        aria-hidden
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-navy-700 text-sm font-medium text-white"
      >
        {initialsOf(profile.fullName)}
      </span>
      {wide && (
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-white">{profile.fullName}</span>
          <span className="block truncate text-xs text-navy-200">{ROLE_LABELS[profile.role]}</span>
        </span>
      )}
      <form action={logout}>
        <button
          type="submit"
          aria-label="Sair"
          title="Sair"
          className="flex size-9 cursor-pointer items-center justify-center rounded-md text-white hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-white"
        >
          <LogOut size={18} aria-hidden />
        </button>
      </form>
    </div>
  );
}

// Botão de recolher/abrir o menu: fica no topo do próprio menu, ao lado da logo (Figma, menu lateral).
function SidebarToggle({ collapsed, onClick }: { collapsed: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
      aria-expanded={!collapsed}
      onClick={onClick}
      className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md border border-navy-200/50 text-white hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-white"
    >
      {collapsed ? <PanelLeftOpen size={18} aria-hidden /> : <PanelLeftClose size={18} aria-hidden />}
    </button>
  );
}

// Busca no topo da funcionária (Figma): leva à listagem do acervo já filtrada. Só no computador; no celular, a busca fica na própria tela do acervo.
function TopSearch() {
  return (
    <form action={ACERVO_PATH} role="search" className="hidden max-w-xl flex-1 md:block">
      <label className="relative block">
        <span className="sr-only">Buscar livros por título, autor ou ISBN</span>
        <Search size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input
          type="search"
          name="q"
          maxLength={100}
          placeholder="Buscar livros por título, autor ou ISBN"
          className="h-10 w-full rounded-md border border-line bg-subtle pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-focus"
        />
      </label>
    </form>
  );
}

function NoticeBell({ count }: { count: number }) {
  const label = count > 0 ? `${count} avisos de prazo` : "Sem avisos de prazo";
  return (
    <span
      role="img"
      aria-label={label}
      className="relative flex size-10 items-center justify-center rounded-full border border-line text-ink-muted"
    >
      <Bell size={20} aria-hidden />
      {count > 0 && (
        <span
          aria-hidden
          className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-danger-700 px-1 text-[11px] font-semibold leading-5 text-white"
        >
          {count > 9 ? "9+" : count}
        </span>
      )}
    </span>
  );
}

function UserMenu({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex cursor-pointer items-center gap-3 rounded-md p-1 pr-2 hover:bg-subtle focus-visible:outline-2 focus-visible:outline-focus"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-medium text-on-brand">
          {profile.fullName.charAt(0).toUpperCase()}
        </span>
        <span className="hidden min-w-0 text-left sm:block">
          <span className="block max-w-40 truncate text-sm font-medium">{profile.fullName}</span>
          <span className="block text-xs text-ink-muted">{ROLE_LABELS[profile.role]}</span>
        </span>
        <ChevronDown size={16} aria-hidden className="text-ink-muted" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-2 w-48 rounded-lg border border-line bg-surface p-1 shadow-md"
        >
          <form action={logout}>
            <button
              type="submit"
              role="menuitem"
              className="flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-subtle focus-visible:outline-2 focus-visible:outline-focus"
            >
              <LogOut size={16} aria-hidden />
              Sair
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// Menu horizontal do aluno (Figma, card 0108, visual editorial): no lugar do menu lateral, só no computador. O início
// fica de fora (a logo leva a ele) e os rótulos são os do frame.
const TOP_NAV_LABELS: Partial<Record<NavItem["key"], string>> = { books: "Acervo", reservations: "Reservas" };

function TopNav({ items, role, pathname }: { items: NavItem[]; role: UserRole; pathname: string }) {
  return (
    <nav aria-label="Menu principal" className="ml-6 hidden items-center gap-1 md:flex">
      {items
        .filter((item) => item.key !== "home")
        .map((item) => {
          const Icon = iconFor(item, role);
          const label = TOP_NAV_LABELS[item.key] ?? item.label;
          const content = (
            <>
              <Icon size={16} strokeWidth={1.5} aria-hidden className="shrink-0" />
              {label}
            </>
          );
          const base = "flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium outline-offset-2 focus-visible:outline-2 focus-visible:outline-focus";
          if (!item.href) {
            return (
              <span key={item.key} aria-disabled="true" title="Em breve" className={`${base} cursor-not-allowed text-ink-muted opacity-60`}>
                {content}
              </span>
            );
          }
          const active = isActive(item, pathname);
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`${base} ${active ? "bg-brand text-on-brand" : "text-ink hover:bg-subtle"}`}
            >
              {content}
            </Link>
          );
        })}
    </nav>
  );
}

// Molde de todas as telas logadas (Figma, card 0101): menu lateral navy por perfil, cabeçalho com sino
// e menu do usuário, e gaveta no celular.
export function AppShell({ profile, noticeCount = 0, children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const pathname = usePathname();
  const items = navItemsFor(profile.role);
  // O aluno usa o menu horizontal no computador (Figma, card 0108); professor e funcionário, o lateral.
  const topNav = profile.role === "student";

  // A gaveta fecha com Escape.
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawer(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawer]);

  return (
    <div className="flex min-h-screen flex-1">
      {/* Menu lateral (computador) */}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col self-start bg-side transition-[width] ${topNav ? "" : "md:flex"} ${collapsed ? "w-[68px]" : "w-60"}`}
      >
        {collapsed ? (
          <div className="flex h-[72px] items-center justify-center px-2">
            <Logo width={40} tone="white" />
          </div>
        ) : (
          <div className="flex h-[72px] items-center justify-between px-5">
            <Logo width={72} tone="white" />
            <SidebarToggle collapsed={false} onClick={() => setCollapsed(true)} />
          </div>
        )}
        <div aria-hidden className="mx-4 border-t border-white/10" />
        {/* Recolhido, o botão de expandir fica logo abaixo da logo, e a logo ocupa a mesma altura da barra do topo (72 px). */}
        {collapsed && (
          <div className="flex justify-center pt-3">
            <SidebarToggle collapsed onClick={() => setCollapsed(false)} />
          </div>
        )}
        <MenuList items={items} role={profile.role} pathname={pathname} wide={!collapsed} />
        <SidebarUser profile={profile} wide={!collapsed} />
      </aside>

      {/* Menu em gaveta (celular) */}
      {drawer && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setDrawer(false)}
            className="absolute inset-0 cursor-default bg-ink/50"
          />
          <aside className="relative flex h-full w-64 flex-col bg-side shadow-lg">
            <div className="flex h-[72px] items-center justify-between px-5">
              <Logo width={72} tone="white" />
              <button
                type="button"
                aria-label="Fechar menu"
                onClick={() => setDrawer(false)}
                className="cursor-pointer rounded-md p-2 text-white hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-white"
              >
                <X size={20} aria-hidden />
              </button>
            </div>
            <div aria-hidden className="mx-4 border-t border-white/10" />
            <MenuList
              items={items}
              role={profile.role}
              pathname={pathname}
              wide
              onNavigate={() => setDrawer(false)}
            />
            <SidebarUser profile={profile} wide />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* O conteúdo da página fica numa coluna de até 1280 px, centralizada. Com o menu lateral, o cabeçalho usa a mesma coluna (como no Figma, onde busca, título e tabelas partem da mesma margem); o menu horizontal do aluno continua de ponta a ponta. */}
        <header className="flex h-[72px] items-center border-b border-line bg-surface px-4 md:px-8">
          <div className={`flex h-full w-full items-center gap-3 ${topNav ? "" : "mx-auto max-w-[1280px]"}`}>
          <button
            type="button"
            aria-label="Abrir menu"
            onClick={() => setDrawer(true)}
            className="cursor-pointer rounded-md p-2 hover:bg-subtle focus-visible:outline-2 focus-visible:outline-focus md:hidden"
          >
            <Menu size={20} aria-hidden />
          </button>
          <div className={topNav ? undefined : "md:hidden"}>
            <Link href={items[0]?.href ?? "/"} aria-label="Início">
              <Logo width={80} />
            </Link>
          </div>
          {topNav && <TopNav items={items} role={profile.role} pathname={pathname} />}
          {/* A busca do topo só procura livros: faz sentido como atalho na tela inicial (Painel). Nas outras telas (usuários, multas, histórico...) ela não ajudaria, e no acervo seria duplicada. */}
          {profile.role === "librarian" && pathname === PANEL_PATH && <TopSearch />}

          <div className="ml-auto flex items-center gap-3">
            <NoticeBell count={noticeCount} />
            <UserMenu profile={profile} />
          </div>
          </div>
        </header>
        <main className="flex-1 bg-page p-4 md:p-8">
          <div className="mx-auto w-full max-w-[1280px]">{children}</div>
        </main>
      </div>
      {/* Aluno e professor tiram dúvidas por aqui; a bibliotecária opera o balcão e não precisa do assistente. */}
      {profile.role !== "librarian" && <HelpAssistant />}
    </div>
  );
}
