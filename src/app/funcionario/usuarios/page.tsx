import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { EmptyState, PageHeader, Pagination, TextField, TextLink } from "@/components";
import { FilterChips } from "@/components/FilterChips";
import { RolePage } from "@/components/RolePage";
import { USER_CREATE_PATH } from "@/domain/users/user-form-rules";
import {
  ROLE_FILTER_LABELS,
  ROLE_FILTER_ORDER,
  STATUS_FILTER_LABELS,
  STATUS_FILTER_ORDER,
  parseUserFilters,
  userEmptyTexts,
  userHref,
  userSummary,
} from "@/domain/users/user-list-rules";
import { USERS_PATH } from "@/domain/users/user-form-rules";
import { listUsers } from "@/services/users-admin.service";
import { UsersDesk } from "./UsersDesk";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Usuários | FAP Books" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// A lista lê os filtros do endereço (dado da requisição), por isso roda dentro do Suspense do RolePage.
async function UsuariosContent({ searchParams, selfId }: { searchParams: SearchParams; selfId: string }) {
  const filters = parseUserFilters(await searchParams);
  const list = await listUsers(filters, selfId);
  const first = list.total === 0 ? 0 : (list.page - 1) * list.pageSize + 1;
  const hasFilter = Boolean(filters.query) || filters.role !== "all" || filters.status !== "all";
  const empty = userEmptyTexts(hasFilter);

  return (
    <>
      <PageHeader
        title="Usuários"
        breadcrumbs={[{ label: "Biblioteca" }, { label: "Usuários" }]}
        description="Gerencie alunos, professores e funcionários."
        action={
          <Link
            href={USER_CREATE_PATH}
            className="inline-flex h-11 items-center gap-2 rounded-md bg-brand px-5 text-sm font-medium text-on-brand hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <Plus size={16} strokeWidth={1.5} aria-hidden />
            Novo usuário
          </Link>
        }
      />

      <div className="mb-4 flex flex-col gap-3">
        <form method="get" action={USERS_PATH} className="flex max-w-2xl items-end gap-3">
          {/* Buscar (ou Enter no campo) mantém os filtros escolhidos. */}
          {filters.role !== "all" && <input type="hidden" name="perfil" value={filters.role} />}
          {filters.status !== "all" && <input type="hidden" name="situacao" value={filters.status} />}
          <TextField
            id="usuarios-busca"
            name="q"
            label="Buscar"
            hideLabel
            type="search"
            defaultValue={filters.query}
            placeholder="Nome, e-mail ou matrícula"
            leadingIcon={Search}
            className="min-w-0 flex-1"
          />
          <button type="submit" className="h-11 cursor-pointer rounded-md bg-brand px-5 text-sm font-medium text-on-brand hover:bg-brand-hover">
            Buscar
          </button>
        </form>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <FilterChips
            label="Filtrar por perfil"
            chips={ROLE_FILTER_ORDER.map((role) => ({
              label: ROLE_FILTER_LABELS[role],
              count: list.counts.byRole[role],
              href: userHref({ ...filters, role, page: 1 }),
              active: filters.role === role,
            }))}
          />
          <FilterChips
            label="Filtrar por situação"
            chips={STATUS_FILTER_ORDER.map((status) => ({
              label: STATUS_FILTER_LABELS[status],
              count: list.counts.byStatus[status],
              href: userHref({ ...filters, status, page: 1 }),
              active: filters.status === status,
            }))}
          />
        </div>
      </div>

      {list.users.length === 0 ? (
        <EmptyState
          title={empty.title}
          description={empty.description}
          action={
            hasFilter ? (
              <TextLink href={USERS_PATH}>Limpar filtros</TextLink>
            ) : (
              <Link href={USER_CREATE_PATH} className="inline-flex h-11 items-center rounded-md bg-brand px-5 text-sm font-medium text-on-brand hover:bg-brand-hover">
                Cadastrar usuário
              </Link>
            )
          }
        />
      ) : (
        <>
          <UsersDesk users={list.users} />
          <Pagination
            page={list.page}
            pages={list.pages}
            summary={userSummary(first, first + list.users.length - 1, list.total)}
            label="Páginas dos usuários"
            hrefFor={(target) => userHref({ ...filters, page: target })}
          />
        </>
      )}
    </>
  );
}

// Só a funcionária abre: o RolePage confere no servidor, além do proxy.ts.
export default function UsuariosPage({ searchParams }: { searchParams: SearchParams }) {
  return <RolePage role="librarian">{(profile) => <UsuariosContent searchParams={searchParams} selfId={profile.id} />}</RolePage>;
}
