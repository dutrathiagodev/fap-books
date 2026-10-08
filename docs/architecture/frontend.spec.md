# Frontend Spec — Next.js + Supabase

Documento normativo: define como o código do FAP Books é organizado. Se você está começando, leia primeiro o [Guia do aluno](guia-do-aluno.md).

## A ideia

A base é a **mesma estrutura que o professor ensinou** (`src/app` para as rotas e `src/components` para os componentes). Ela cresce em **níveis**, só quando o projeto precisar. Quem sabe o Nível 1 já consegue trabalhar em qualquer tela.

Nesta fase o projeto tem **duas peças**: o site (Next.js) e o Supabase (banco, login e arquivos). Não existe API separada. O NestJS foi adiado (ver [README](README.md)).

## Níveis

| Nível | Quando usar | O que tem |
| -- | -- | -- |
| **1 — Base (o do professor)** | **Sempre**, em todas as telas | `app`, `components`, `lib`, `services`, `types` |
| **2 — Regras do negócio** | Quando aparece uma regra: limite de 5 livros, prazo de 7 dias, multa de R$ 1,00 por dia | Nível 1 + `domain` (funções puras e testadas) |
| **3 — Camadas completas** | Só se o time pedir, no futuro | [Camadas completas](futuro/camadas-completas.md) |

## Nível 1 — Estrutura

```text
src/
  app/                          # as rotas (igual ao projeto do professor)
    <rota>/page.tsx
    <rota>/loading.tsx          # tela de carregamento da rota
    <rota>/error.tsx            # tela de erro da rota
  components/                   # os componentes (igual ao projeto do professor)
    Button.tsx
    BookCard.tsx
    index.tsx                   # reexporta todos: export { Button, BookCard }
  lib/
    supabase/
      browser-client.ts         # Supabase no navegador
      server-client.ts          # Supabase no servidor
  services/
    books.service.ts            # funções que buscam e salvam dados
  types/
    books.ts                    # tipos do TypeScript (Book)
```

### Quem faz o quê

| Pasta | Responsabilidade | Pode usar | Não pode |
| -- | -- | -- | -- |
| `app` | Montar a tela da rota | `components`, `services`, `types` | Falar com o Supabase direto |
| `components` | Desenhar um pedaço da tela | outros `components`, `types` | Buscar dados, conhecer o Supabase |
| `services` | Buscar e salvar dados | `lib`, `types` | Importar de `app` ou `components` |
| `lib` | Criar os clientes do Supabase | pacotes externos | Conhecer telas |
| `types` | Descrever os dados | nada | Ter lógica |

Regra de ouro: **a tela pede dados ao `service`, e só o `service` fala com o Supabase.**

### Regras do Nível 1

1. **Um componente por arquivo**, nome em `PascalCase` (`BookCard.tsx`), com `interface` das props e exportado no `index.tsx`.
2. **A rota é simples.** `page.tsx` monta a tela chamando `services` e `components`. Sem regra de negócio.
3. **Servidor por padrão.** A `page` busca os dados no servidor (função `async`). Use `"use client"` só em quem tem `useState`, formulário ou clique.
4. **Os 4 cenários.** Toda tela com dados trata: carregando (`loading.tsx`), erro (`error.tsx`), vazio (uma mensagem) e sucesso.
5. **Dados só pelos `services`.** Componentes e páginas nunca chamam o Supabase nem `fetch`.
6. **Tipos em `types`.** Nada de `any`.
7. **Segurança em duas barreiras.** O servidor checa quem é o usuário e o **RLS** do Supabase protege o banco. Toda tabela tem RLS ([supabase.spec.md](supabase.spec.md)).
8. **Login.** A sessão é do Supabase Auth. O `src/proxy.ts` protege as rotas (nesta versão do Next.js o antigo *middleware* se chama *proxy*).
9. **Segredos.** Só `NEXT_PUBLIC_*` vai ao navegador. A chave de serviço do Supabase nunca.

## Nível 2 — Regras do negócio

Quando a feature tiver uma regra, ela vai para funções **puras** (sem React, Next ou Supabase) em `src/domain/<feature>/`, com teste:

```text
src/domain/loans/
  loan-rules.ts            # canBorrow(), calculateFine(), calculateDueDate()
  loan-rules.test.ts
```

O `service` chama essas funções antes de salvar. Assim a regra fica em um lugar só, é fácil de explicar e de testar. Exemplo: `calculateFine(daysLate)` devolve `daysLate * 100` (centavos).

## Convenções

- Componentes: `PascalCase.tsx`. Services: `kebab-case.service.ts`. Tipos e regras: `kebab-case.ts`.
- Código em **inglês** (`Book`, `Loan`, `listBooks`) e textos da tela em **português**, como no projeto do professor.
- Imports com o alias `@/` apontando para `src/`: `import { Button } from "@/components";`.
- Rotas em inglês curto, como no projeto do professor (`/login`, `/books`, `/loans`).

## Não permitido

- Chamar o Supabase ou `fetch` dentro de componente ou de `page`.
- Regra de negócio dentro de componente.
- Tabela sem RLS.
- `any` sem comentário explicando o motivo.
- Chave ou senha no código.
- Criar pasta ou camada nova sem **perguntar ao responsável**.

## Critérios de aceitação

- A feature segue a estrutura do Nível 1 (e do Nível 2, se houver regra).
- Tela trata carregando, erro, vazio e sucesso.
- Regras com teste.
- Passam: `npm run lint`, `npm run typecheck` e `npm run build` (e `npm run test`, quando o Vitest estiver instalado).
- O PR descreve o que mudou e como testar ([qualidade.md](qualidade.md)).

## Processo

1. Gere a base: `scripts/arch/create-feature-web.sh <feature>`.
2. Troque os nomes de exemplo pelo domínio real.
3. Crie a migration do banco ([supabase.spec.md](supabase.spec.md)).
4. Se houver regra do negócio, crie o Nível 2.
5. Rode as verificações e abra o PR.

Guia prático: [frontend.skills.md](frontend.skills.md).
