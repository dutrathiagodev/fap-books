# Guias de estudo

Guias curtos, com **código básico explicado linha a linha**, para tirar dúvidas sem depender de ninguém. Escritos para quem está começando.

| Guia | Para quê | Status no projeto |
| -- | -- | -- |
| [React](react.md) | Componentes, props, estado, listas e formulários | **Em uso** |
| [Next.js](nextjs.md) | Rotas, Server e Client Components, Server Actions | **Em uso** |
| [Tailwind CSS](tailwind.md) | Estilizar com classes: espaço, cor, flex e responsivo | **Em uso** |
| [Supabase](supabase.md) | Banco de dados, login e RLS | **Em uso** |
| [NestJS](nestjs.md) | Criar uma API organizada | **Futuro** (fora do projeto por enquanto) |
| [Dicas de profissional](dicas-de-profissional.md) | Erros, Git, PR, segurança e como aprender | Para todo mundo |

## Como usar

1. **Leia na ordem** React, Next.js, Tailwind e Supabase, mas **não tudo de uma vez**: abra o guia quando a tarefa pedir.
2. **Digite o código** em vez de só copiar. Mude um valor e veja o que acontece.
3. **Anote a dúvida** que sobrar e leve ao time.

## Trilha sugerida

1. [React](react.md): componente, props e `useState`.
2. [Tailwind CSS](tailwind.md): o que você já usa em aula.
3. [Next.js](nextjs.md): rotas e a diferença entre servidor e navegador.
4. [Supabase](supabase.md): ler e gravar dados e entender o RLS.
5. [Dicas de profissional](dicas-de-profissional.md): releia a cada semana.

## Conferindo o seu entendimento

Depois de cada guia, tente responder **sem olhar**:

- Qual é a diferença entre **props** e **estado**?
- Quando preciso do `"use client"`?
- Por que só o **service** fala com o Supabase?
- O que o **RLS** faz, e o que acontece com uma tabela sem policy?

Não conseguiu? Releia só aquele trecho. Ainda travou? Pergunte.

## Documentação oficial

- React: https://pt-br.react.dev
- Next.js: https://nextjs.org/docs (e a versão instalada em `node_modules/next/dist/docs/`)
- Tailwind CSS: https://tailwindcss.com/docs
- Supabase: https://supabase.com/docs
- NestJS: https://docs.nestjs.com
- MDN (HTML, CSS e JavaScript): https://developer.mozilla.org/pt-BR/

Veja também o [Guia do aluno](../architecture/guia-do-aluno.md) e o [tutorial do grupo](../tutorial-do-grupo.md).
