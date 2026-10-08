# Template de feature (scaffold)

Gera a base de uma feature já no padrão de [frontend.spec.md](frontend.spec.md), a mesma estrutura do projeto do professor (`app` e `components`) mais `services` e `types`.

## Comando

Na raiz do projeto:

```bash
scripts/arch/create-feature-web.sh <feature-em-kebab-case> [EntidadeNoSingular]
```

Exemplo:

```bash
scripts/arch/create-feature-web.sh books Book
```

O segundo argumento é o nome do tipo no singular. Se você não passar, o script tira o "s" do final (`books` → `Book`).

## O que o script cria

| Pasta | Arquivo | Para quê |
| -- | -- | -- |
| `src/types` | `books.ts` | O tipo `Book` |
| `src/services` | `books.service.ts` | `listBooks()`, que fala com o Supabase |
| `src/components` | `BooksList.tsx` | Componente que desenha a lista (também entra no `index.tsx`) |
| `src/app/books` | `page.tsx`, `loading.tsx`, `error.tsx` | A rota com os 4 cenários: carregando, erro, vazio e sucesso |

Se a feature já existir, o script **não altera nada** e avisa.

## Depois de gerar

1. Troque os campos de exemplo (`id` e `name`) pelos reais em `src/types`.
2. Crie a migration da tabela e siga o checklist de [supabase.spec.md](supabase.spec.md):
   ```bash
   scripts/arch/create-migration.sh create_<feature>_table
   ```
3. Confira se `src/lib/supabase/server-client.ts` existe (criado no card `FAP - 0003`).
4. Se houver regra do negócio, crie `src/domain/<feature>/` com testes (Nível 2).
5. Rode as verificações:
   ```bash
   npm run lint && npm run typecheck && npm run build
   ```

## Migrations

```bash
scripts/arch/create-migration.sh <nome_em_snake_case>
```

Cria `supabase/migrations/AAAAMMDDHHMMSS_<nome>.sql` com um modelo seguro (RLS, `grant` e policy) comentado.

## Camadas completas (futuro)

O gerador das 6 camadas continua disponível, mas **não deve ser usado agora**: `scripts/arch/create-feature-completa.sh`. Veja [futuro/camadas-completas.md](futuro/camadas-completas.md).

## Observações

- O scaffold gera uma base **propositalmente simples**. Ajuste os nomes ao contexto da feature.
- Os scripts usam `src/` na raiz do projeto. A migração do app para `src/` faz parte do card `FAP - 0003`.
