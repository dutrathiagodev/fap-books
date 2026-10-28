import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/InfoPage";
import { PRIVACY_PATH, SUPPORT_PATH } from "@/domain/access/access-rules";

export const metadata: Metadata = { title: "Termos e Condições | FAP Books" };

// Termos de uso (Figma, rodapé do card 0195). Os números do empréstimo são os da landing (src/content/landing.ts, NUMBERS).
export default function TermosPage() {
  return (
    <InfoPage
      title="Termos e Condições"
      intro="Regras para usar o FAP Books, o sistema da Biblioteca Professor Renato Gross, da Faculdade Adventista do Paraná."
    >
      <section className="flex flex-col gap-2">
        <h2>Quem pode usar</h2>
        <p>
          Alunos, professores e a equipe da biblioteca. O cadastro é confirmado pela equipe da biblioteca; depois dele
          você entra com o seu e-mail e a sua senha.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2>Empréstimos, reservas e multas</h2>
        <ul>
          <li>Cada pessoa pode ficar com até 3 livros ao mesmo tempo.</li>
          <li>O prazo do empréstimo é de 7 dias.</li>
          <li>Professores podem fazer reserva pedagógica por até 30 dias, para as suas disciplinas.</li>
          <li>Livro devolvido depois do prazo gera multa de R$ 1,00 por dia de atraso.</li>
        </ul>
        <p>As regras da biblioteca valem tanto no balcão quanto no sistema; em caso de dúvida, vale a decisão da equipe.</p>
      </section>

      <section className="flex flex-col gap-2">
        <h2>Cuidados com a sua conta</h2>
        <ul>
          <li>A conta é pessoal: não compartilhe a sua senha.</li>
          <li>Avise a biblioteca se achar que alguém usou a sua conta.</li>
          <li>Use o sistema só para o que ele foi feito: consultar o acervo e cuidar dos seus empréstimos.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2>Disponibilidade e mudanças</h2>
        <p>
          Fazemos o possível para o sistema ficar no ar, mas ele pode ficar fora por manutenção. Podemos atualizar estes
          termos; a versão desta página é sempre a que vale.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2>Seus dados</h2>
        <p>
          Como guardamos e usamos os seus dados está no <Link href={PRIVACY_PATH}>aviso de privacidade</Link>.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2>Dúvidas</h2>
        <p>
          Fale com a biblioteca pela página de <Link href={SUPPORT_PATH}>suporte</Link>.
        </p>
      </section>
    </InfoPage>
  );
}
