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

## 3. Antes de abrir o PR

Rode e confirme que passa:

```bash
npm run typecheck
npm run lint
npm test
```

E marque o checklist do modelo de PR (`.github/pull_request_template.md`). Quem revisa confere os mesmos pontos e pode pedir ajuste: qualidade e segurança não são opcionais.
