# Qualidade de software no FAP Books

Esta é uma **regra do projeto**: todo código que entra (de qualquer pessoa da equipe) precisa ser **limpo**, **fácil de a equipe entender** e **seguro**. Ela vale para PR de código, de banco e de documentação técnica.

## 1. Código limpo e fácil de entender

- **Nomes claros**, em português nos textos da tela e nas regras de negócio, e que dizem o que a coisa faz.
- **Componentes e funções pequenos**, com uma responsabilidade só. Se precisa de "e" para descrever, divida.
- **Textos e dados fora do JSX**: textos de seção, listas e números ficam em constantes no topo ou em arquivo de conteúdo, não espalhados no meio da marcação.
- **Regras de negócio puras em `src/domain`**, com teste ao lado (`*.test.ts`). Telas só chamam serviços; só os serviços falam com o Supabase.
- **Comentário curto explicando o porquê**, não o que a linha faz. Sem código morto nem comentado.
- **Reuse antes de criar**: use `Button`, `Logo`, `PageHeader` e os tokens do design system (`globals.css`) em vez de repetir classes.
- **Acessível por padrão**: rótulos, foco visível, `alt` útil (ou vazio em imagem decorativa), contraste do design system.

## 2. Segurança

- **Nenhum segredo no código** nem no Git: chaves ficam em `.env.local` e nos segredos do GitHub/Vercel. Só a chave pública (`NEXT_PUBLIC_*`) vai ao navegador.
- **Valide toda entrada no servidor** (ação, rota, formulário), mesmo que a tela já valide. Nunca confie no que vem do navegador.
- **Permissão no servidor, não só na tela**: cada ação confere o perfil (`requireRole`), e o banco protege com **RLS em toda tabela**.
- **Menor privilégio**: ninguém recebe mais acesso do que precisa; a chave de serviço do Supabase nunca vai ao navegador.
- **Dados pessoais (LGPD)**: só o necessário; auditoria guarda **só ids**, nunca nome, e-mail ou texto livre (ver `docs/database/lgpd.md`).
- **Nada de `dangerouslySetInnerHTML`** nem montar SQL ou HTML com texto de usuário. Links externos com `rel="noopener noreferrer"`.
- **Mensagens de erro próprias**: nunca mostrar o erro bruto do banco ou do servidor.
- **Dependências**: só as necessárias e conhecidas; rodar `npm audit` antes de uma release.

### Alertas do Dependabot aceitos

Regra: alerta em dependência que vai para produção se corrige na hora (`npm audit --omit=dev` precisa dar 0). Alerta só de ferramenta de desenvolvimento, sem correção compatível, pode ser aceito, desde que fique registrado aqui e o motivo no próprio alerta.

| Alerta | Pacote | Onde entra | Decisão |
| -- | -- | -- | -- |
| #2 (GHSA-g3hv-75wg-m249, moderado 6,9) | `minimatch` < 11.0.1 | só no ESLint e nos plugins dele (`eslint`, `eslint-plugin-import`, `jsx-a11y`, `react`, `typescript-estree`); não está na produção (`npm ls minimatch --omit=dev` vazio) | **Aceito em 03/11/2026 (risco tolerável).** A falha pede um padrão de glob controlado por quem ataca; aqui os padrões vêm dos nossos próprios arquivos de configuração. Não há correção compatível: até o ESLint 10.14 pede `minimatch` ^10, e os plugins pedem ^3, e a versão 11 muda a forma de importar (forçar com `overrides` quebraria o lint). O `npm audit fix --force` instalaria o ESLint 4, o que também quebraria. **Rever** quando o ESLint, o `typescript-eslint` e os plugins atualizarem. |

## 3. Antes de abrir o PR

Rode e confirme que passa:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Se algum falhar, não abra o PR: leia a mensagem, corrija e rode de novo. O CI roda os mesmos quatro passos.

O que testar: o que, se quebrar, dá prejuízo. As regras do negócio (limite de 3 itens, prazo de 7 dias, multa de R$ 1,00 por dia, reserva pedagógica de até 30 dias), com um teste do caso certo e um do caso que deve falhar; e a segurança do banco (o aluno lê só o dele). Os testes ficam ao lado do código, em `*.test.ts` (Vitest).

PR bom: pequeno (uma ideia), com título e descrição claros (o que mudou, por quê, como testar), branch `FAP/<número do card>`, commits com `feat:`, `fix:`, `docs:`, `chore:` ou `ci:`, sem `console.log`, código comentado ou arquivo fora da tarefa. Teste a tela em desktop e celular.

E marque o checklist do modelo de PR (`.github/pull_request_template.md`). Quem revisa confere os mesmos pontos e pode pedir ajuste: qualidade e segurança não são opcionais. Perguntas da revisão: entendi o que o código faz? Está na camada certa ([arquitetura](arquitetura.md))? Tem teste da regra? Se o banco mudou, tem migration, RLS e `grant`? Algum nome pode ser mais claro?
