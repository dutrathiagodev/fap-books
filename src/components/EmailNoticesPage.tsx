import { EmailNoticesForm } from "@/components/EmailNoticesForm";
import { PageHeader } from "@/components/PageHeader";
import { RolePage } from "@/components/RolePage";
import { FieldError } from "@/components/FieldError";
import { getMyEmailNotices } from "@/services/email-notices.service";
import type { UserRole } from "@/types/profile";

// Tela "Avisos por e-mail" de cada perfil (a conferência de quem acessa é do RolePage).
export function EmailNoticesPage({ role }: { role: UserRole }) {
  return (
    <RolePage role={role}>
      {async (profile) => {
        const enabled = await getMyEmailNotices(profile.id);
        return (
          <>
            <PageHeader
              title="Avisos por e-mail"
              breadcrumbs={[{ label: "Minha conta" }, { label: "Avisos por e-mail" }]}
              description="Escolha se quer ser lembrado dos prazos de devolução fora do sistema."
            />
            {enabled === null ? (
              <FieldError message="Não foi possível carregar a sua preferência. Recarregue a página." />
            ) : (
              <EmailNoticesForm email={profile.email} enabled={enabled} />
            )}
          </>
        );
      }}
    </RolePage>
  );
}
