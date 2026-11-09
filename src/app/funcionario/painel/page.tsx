import { Suspense } from "react";
import { Banknote, BookOpen, Library, TriangleAlert } from "lucide-react";
import { Button, PageHeader } from "@/components";
import { DeadlineBanner } from "@/components/DeadlineBanner";
import { IndicatorCard } from "@/components/IndicatorCard";
import { PanelSkeleton } from "@/components/PanelSkeleton";
import { PendingList } from "@/components/PendingList";
import { RolePage } from "@/components/RolePage";
import { ShortcutBar } from "@/components/ShortcutBar";
import { ACERVO_PATH } from "@/domain/access/access-rules";
import { formatReais } from "@/domain/loans/loan-rules";
import { buildPendingItems, noticeHref, NOTICES_PATH, PANEL_SHORTCUTS } from "@/domain/panel/panel-rules";
import { getPanelSummary, listDeadlineNotices, listPendingPedagogical } from "@/services/panel.service";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Painel | FAP Books" };

// Números, avisos e reservas pendentes buscados juntos: uma ida ao banco por bloco, todas ao mesmo tempo.
// Se qualquer uma falhar, a página cai no error.tsx (tela "Não foi possível carregar o painel").
async function PanelData() {
  const [summary, notices, pedagogical] = await Promise.all([getPanelSummary(), listDeadlineNotices(), listPendingPedagogical()]);
  const pending = buildPendingItems(pedagogical, notices);

  return (
    <div className="flex flex-col gap-6">
      <section aria-label="Indicadores do dia" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <IndicatorCard
          label="Emprestados"
          value={String(summary.borrowed)}
          icon={BookOpen}
          href="/funcionario/emprestimos?aba=devolucao"
          description={`${summary.borrowed} livros emprestados`}
        />
        <IndicatorCard
          label="Atrasados"
          value={String(summary.overdue)}
          icon={TriangleAlert}
          tone={summary.overdue > 0 ? "danger" : "default"}
          href={noticeHref("overdue")}
          description={`${summary.overdue} empréstimos atrasados`}
        />
        <IndicatorCard
          label="Disponíveis"
          value={String(summary.availableCopies)}
          icon={Library}
          href={ACERVO_PATH}
          description={`${summary.availableCopies} exemplares disponíveis`}
        />
        <IndicatorCard
          label="Multas em aberto"
          value={formatReais(summary.openFinesCents)}
          icon={Banknote}
          href="/funcionario/multas"
          description={`${summary.openFines} multas em aberto, ${formatReais(summary.openFinesCents)}`}
        />
      </section>

      <ShortcutBar label="Atalhos de operação" shortcuts={[...PANEL_SHORTCUTS]} />

      <DeadlineBanner summary={summary} />

      <PendingList
        items={pending}
        moreHref={NOTICES_PATH}
        emptyAction={<Button text="Novo empréstimo" href={PANEL_SHORTCUTS[0].href} size="default" fullWidth={false} />}
      />
    </div>
  );
}

function PainelContent() {
  return (
    <>
      <PageHeader title="Painel" breadcrumbs={[{ label: "Biblioteca" }, { label: "Painel" }]} description="Visão geral do dia na biblioteca." />
      {/* O cabeçalho aparece já; o esqueleto ocupa o lugar dos números até eles chegarem. */}
      <Suspense fallback={<PanelSkeleton />}>
        <PanelData />
      </Suspense>
    </>
  );
}

// Só a bibliotecária abre: o RolePage confere no servidor, além do proxy.ts.
export default function PainelPage() {
  return <RolePage role="librarian">{() => <PainelContent />}</RolePage>;
}
