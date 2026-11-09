import { BellOff } from "lucide-react";
import { EmptyState, PageHeader, TextLink } from "@/components";
import { DeadlineNoticeList } from "@/components/DeadlineNoticeList";
import { FilterChips } from "@/components/FilterChips";
import { RolePage } from "@/components/RolePage";
import { NOTICE_FILTER_LABELS, NOTICE_LIMIT, noticeHref, parseNoticeFilter, PANEL_PATH } from "@/domain/panel/panel-rules";
import { listDeadlineNotices } from "@/services/panel.service";
import type { NoticeFilter } from "@/types/panel";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Avisos de prazo | FAP Books" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const CHIP_ORDER: NoticeFilter[] = ["all", "soon", "today", "overdue"];

// O filtro vem do endereço (dado da requisição), por isso roda dentro do Suspense do RolePage.
async function AvisosContent({ searchParams }: { searchParams: SearchParams }) {
  const filter = parseNoticeFilter((await searchParams).filtro);
  const notices = await listDeadlineNotices(filter);

  return (
    <>
      <PageHeader
        title="Avisos de prazo"
        breadcrumbs={[{ label: "Biblioteca" }, { label: "Painel" }, { label: "Avisos de prazo" }]}
        description="Empréstimos que vencem em breve ou estão atrasados."
      />

      <div className="mb-3">
        <FilterChips
          label="Filtrar avisos"
          tone="solid"
          chips={CHIP_ORDER.map((chip) => ({ label: NOTICE_FILTER_LABELS[chip], href: noticeHref(chip), active: chip === filter }))}
        />
      </div>
      {/* Só promete o que existe: por enquanto o aviso é visto aqui e no painel (o envio por e-mail ainda não está ativo). */}
      <p className="mb-6 text-xs text-ink-muted">Os avisos aparecem aqui e no painel. O envio por e-mail ainda não está ativo.</p>

      {notices.length === 0 ? (
        <EmptyState
          icon={BellOff}
          title="Nenhum prazo próximo"
          description="Quando um empréstimo estiver perto de vencer ou atrasar, ele aparece aqui."
          action={<TextLink href={PANEL_PATH}>Voltar ao painel</TextLink>}
        />
      ) : (
        <>
          <DeadlineNoticeList notices={notices} />
          {notices.length >= NOTICE_LIMIT && (
            <p className="mt-6 text-sm text-ink-muted">Mostrando os {NOTICE_LIMIT} avisos mais urgentes.</p>
          )}
        </>
      )}
    </>
  );
}

// Só a bibliotecária abre: o RolePage confere no servidor, além do proxy.ts.
export default function AvisosPage({ searchParams }: { searchParams: SearchParams }) {
  return <RolePage role="librarian">{() => <AvisosContent searchParams={searchParams} />}</RolePage>;
}
