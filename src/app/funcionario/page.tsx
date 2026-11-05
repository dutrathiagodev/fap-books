import { RolePage } from "@/components/RolePage";
import { UserPanel } from "@/components";

export default function FuncionarioPage() {
  return <RolePage role="librarian">{(profile) => <UserPanel title="Área da funcionária" profile={profile} />}</RolePage>;
}
