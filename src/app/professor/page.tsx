import { RolePage } from "@/components/RolePage";
import { UserPanel } from "@/components";

export default function ProfessorPage() {
  return <RolePage role="teacher">{(profile) => <UserPanel title="Área do professor" profile={profile} />}</RolePage>;
}
