import { redirect } from "next/navigation";
import { ROLE_LANDING } from "@/domain/access/access-rules";

// O endereço-base da área não tem tela própria: quem entra vai direto ao acervo.
// Não confere o perfil aqui: o proxy.ts já manda para /login quem não está logado e para a própria área quem é de
// outro perfil, e a primeira tela (o acervo) confere de novo no servidor. Sem ler a sessão, a página continua estática.
export default function ProfessorPage() {
  redirect(ROLE_LANDING.teacher);
}
