# Arquitetura do FAP Books

Índice dos documentos e registro das decisões. O time está **aprendendo**: nada aqui deve ser mais avançado do que o necessário.

## Por onde começar

| Quem | Leia |
| -- | -- |
| Está começando | [Guia do aluno](guia-do-aluno.md) |
| Vai criar uma feature | [Frontend skills](frontend.skills.md) e [Template de feature](feature.template.md) |
| Vai mexer no banco | [Supabase spec](supabase.spec.md) |
| Vai abrir um PR | [Guia de qualidade](qualidade.md) |
| Quer as regras completas | [Frontend spec](frontend.spec.md) |

## Decisões

| Decisão | Motivo | Data |
| -- | -- | -- |
| O projeto começa **só com Next.js + Supabase** | O time nunca teve aula de backend e banco; menos peças para aprender de uma vez. Prioridade é o front | 2026-10-08 |
| **NestJS adiado** | Só entra por decisão do time. Antes de criar qualquer repositório ou tecnologia nova, **perguntar** ao responsável | 2026-10-08 |
| Camadas **completas** (domain, data, infra, presenter, modules, main/di) | O time quer o máximo de camadas para aprender, com guia para tudo | 2026-10-08 |
| Montagem de dependências por **funções simples** (`makeXxx()`) | A forma mais fácil de entender; permite evoluir depois sem travar o projeto | 2026-10-08 |
| **Qualidade é prioridade** | Lint, typecheck, testes e build a cada PR, com guia explicando cada um | 2026-10-08 |
| App na **raiz** do repositório, código em `src/` | Sem monorepo enquanto não houver segundo projeto | 2026-10-08 |
| Banco **sempre versionado** em migrations, **RLS em toda tabela** | Segurança e histórico; não há API entre o site e o banco | 2026-10-08 |
| Supabase na região **Brasil (São Paulo)** | Usuários da FAP estão no Brasil | 2026-10-07 |

## Em aberto (a confirmar com o time)

- **Idioma dos nomes no código:** proposta de **inglês** (`Book`, `Loan`) com a tela em português.
- **Ferramenta de testes:** proposta de **Vitest** e **Testing Library**.
- **Dois níveis de estrutura:** proposta de usar a estrutura simples (`app`, `components`, `lib`) para telas sem regra de negócio, como login, e as camadas completas só nas features com regra (empréstimo, multa, reserva). Hoje o spec pede as camadas completas em tudo.

## Régua de simplicidade

Antes de adicionar uma ferramenta, uma camada ou um padrão novo, responda:

1. **Alguém do time consegue explicar isso em dois minutos?** Se não, é avançado demais por enquanto.
2. **Existe um jeito mais simples que resolve?** Se existe, use esse.
3. **Precisamos disso agora?** Se não, vai para o Backlog.
4. **Está no guia?** Se for aceito, o [guia do aluno](guia-do-aluno.md) é atualizado no mesmo PR.

Se alguma resposta for "não", **pergunte ao responsável antes de seguir**.

## Referências

### Documentação oficial (fonte principal)

| Documentação | Para que usar | Cuidado |
| -- | -- | -- |
| [Next.js](https://nextjs.org/docs) | Rotas, Server Components, Server Actions, `proxy.ts` | O site mostra a versão mais nova. Este projeto usa uma versão específica: **confira também a documentação instalada**, em `node_modules/next/dist/docs/` (veja o `AGENTS.md`) |
| [Supabase](https://supabase.com/docs) | Banco, Auth, RLS, Storage, migrations e CLI | Siga os guias de **Next.js** e de **Row Level Security** |
| [NestJS](https://docs.nestjs.com/) | Referência da **fase futura**, quando e se o NestJS entrar | Fora do escopo agora. Não adicionar ao projeto sem perguntar |

### Exemplos e materiais de estudo

| Referência | O que aproveitamos | Cuidado |
| -- | -- | -- |
| [SamuelSackey/nextjs-supabase-example](https://github.com/SamuelSackey/nextjs-supabase-example) | Exemplo para iniciantes: login com Supabase, rotas protegidas e dois clientes (`browser-client` e `server-client`). Seguimos a mesma ideia em `src/infra/supabase/` | Usa **Next.js 14**. Aqui é o Next.js 16: `cookies()` é **assíncrono** (`await cookies()`) e o antigo *middleware* se chama **proxy** (`proxy.ts`). **Não copie código sem adaptar** |
| [Vídeo (YouTube)](https://www.youtube.com/watch?v=Z2EX_opXWuA) | Apoio visual de estudo | O vídeo não foi analisado por quem escreveu estes documentos |
| [Artigo: NestJS + Next.js + Supabase](https://shobhitb.medium.com/building-full-stack-application-with-nestjs-nextjs-and-supabase-fce78be07074) | Referência para a **fase futura**, quando e se o NestJS entrar | O artigo não foi lido por quem escreveu estes documentos |

Ao usar uma referência, passe pela régua de simplicidade acima.

## Documentos

- [frontend.spec.md](frontend.spec.md): regras obrigatórias do frontend
- [frontend.skills.md](frontend.skills.md): guia prático
- [supabase.spec.md](supabase.spec.md): banco, migrations, RLS e chaves
- [feature.template.md](feature.template.md): como gerar uma feature
- [guia-do-aluno.md](guia-do-aluno.md): explicação do zero
- [qualidade.md](qualidade.md): verificações e boas práticas de PR
