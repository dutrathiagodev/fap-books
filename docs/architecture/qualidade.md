# Guia de qualidade

A qualidade é prioridade no FAP Books. Este guia diz **o que verificar**, **como** e **por quê**, em linguagem simples.

## As 5 verificações antes de abrir um PR

| Comando | O que confere | Por que importa |
| -- | -- | -- |
| `npm run lint` | Estilo e erros comuns de código | Todo mundo escreve do mesmo jeito |
| `npm run typecheck` | Tipos do TypeScript | Pega erro de nome e de tipo antes de rodar |
| `npm run test` | Testes automáticos | Garante que as regras continuam certas |
| `npm run build` | Se o site compila para produção | Evita quebrar a publicação |
| Revisar o diff | Você leu o que mudou? | Você é a primeira pessoa a revisar |

Se algum falhar, **não abra o PR**. Leia a mensagem, corrija e rode de novo.

## O que testar

Não é preciso testar tudo. Teste o que, se quebrar, causa prejuízo:

1. **Regras do negócio:** limite de 5 livros, prazo de 7 dias, multa de R$ 1,00 por dia, reserva pedagógica de até 30 dias. Cada regra tem pelo menos um teste do caso certo e um do caso que deve falhar.
2. **Fluxo principal da page:** carregando, vazio e sucesso aparecem.
3. **Segurança do banco:** a policy deixa o aluno ler só o dele e bloqueia o que não pode.

Ferramentas: Vitest (testes) e Testing Library (telas). Elas serão adicionadas no card de configuração do projeto.

## Como é um bom PR

- **Pequeno:** uma ideia só.
- **Título e descrição claros:** o que mudou, por quê e como testar.
- **Nome da branch:** `FAP/<número do card>`.
- **Commits no padrão:** `feat:`, `fix:`, `docs:`, `chore:`, `ci:`.
- **Sem sujeira:** sem `console.log` esquecido, sem código comentado, sem arquivo que não é da tarefa.
- **Sem segredos:** nunca chave, senha ou token no código.

## Revisão de código (quando você revisa alguém)

Pergunte, com gentileza:

1. Eu entendi o que este código faz?
2. Está na camada certa?
3. Tem teste da regra?
4. Se o banco mudou, tem migration, RLS e `grant`?
5. Algum nome poderia ser mais claro?

Revisar é aprender. Elogie o que está bom e explique o motivo de cada pedido.

## Acessibilidade e responsividade

- Teste a tela em **desktop e celular** (o PRD exige as duas).
- Todo campo tem rótulo e todo botão tem texto claro.
- Cores do tema: navy `#032B5E` e `#0D3B6E`, branco `#FFFFFF` e cinza `#8C8C8C`. Confira o contraste do texto.

## Definition of Done

Uma tarefa só está pronta quando:

- [ ] Segue a estrutura e as regras do [frontend.spec.md](frontend.spec.md)
- [ ] As 5 verificações passam
- [ ] Tem teste das regras envolvidas
- [ ] Funciona em desktop e celular
- [ ] Banco com migration, RLS e `grant` (se mexeu no banco)
- [ ] PR revisado por mais uma pessoa
- [ ] Card movido para Done
