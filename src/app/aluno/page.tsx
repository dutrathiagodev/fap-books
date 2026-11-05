import { RolePage } from "@/components/RolePage";
import { UserPanel } from "@/components";

export default function AlunoPage() {
  return <RolePage role="student">{(profile) => <UserPanel title="Área do aluno" profile={profile} />}</RolePage>;
}
