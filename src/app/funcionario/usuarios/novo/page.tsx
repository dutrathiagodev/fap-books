import { RolePage } from "@/components/RolePage";
import { UserCreateForm } from "./_components/UserCreateForm";
import { createUserAction } from "./actions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Cadastro de usuário | FAP Books" };

// Cadastro de usuários (FAP-0087): aluno, professor e funcionário. A conferência de quem acessa é do RolePage.
export default function NovoUsuarioPage() {
  return (
    <RolePage role="librarian">{() => <UserCreateForm onCreate={createUserAction} />}</RolePage>
  );
}
