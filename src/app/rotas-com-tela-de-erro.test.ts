import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Toda tela que busca dado precisa de uma tela de erro própria (src/components/PageError): sem ela, a falha de uma
// consulta mostraria a tela padrão do Next, em inglês e sem saída. A raiz (src/app/error.tsx) é a rede de segurança.
const ROTAS = [
  "",
  "funcionario/acervo",
  "funcionario/acervo/novo",
  "funcionario/emprestimos",
  "funcionario/historico",
  "funcionario/multas",
  "funcionario/painel",
  "funcionario/painel/avisos",
  "funcionario/relatorios",
  "funcionario/reservas-pedagogicas",
  "funcionario/reservas-pedagogicas/nova",
  "funcionario/usuarios",
  "funcionario/usuarios/novo",
  "aluno/livros",
  "professor/livros",
  "professor/reserva-pedagogica",
];

describe("telas de erro", () => {
  it.each(ROTAS)("a rota /%s tem error.tsx", (rota) => {
    expect(existsSync(join(process.cwd(), "src/app", rota, "error.tsx"))).toBe(true);
  });
});
