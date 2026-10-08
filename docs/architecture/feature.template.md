# Template de feature (scaffold)

Gera a base de uma feature já no padrão de [frontend.spec.md](frontend.spec.md), para você começar sem montar as pastas na mão.

## Comando

Na raiz do projeto:

```bash
scripts/arch/create-feature-web.sh <feature-em-kebab-case> [EntidadeNoSingular]
```

Exemplo:

```bash
scripts/arch/create-feature-web.sh books Book
```

O segundo argumento é o nome da entidade no singular. Se você não passar, o script tira o "s" do final (`books` → `Book`).

## O que o script cria

| Camada | Arquivos |
| -- | -- |
| domain | entidade, contrato do repositório e caso de uso `list-<feature>` |
| data | model, mapper e `repository-impl` |
| infra | adaptador do Supabase |
| presenter | state e Server Action de exemplo |
| modules | page e as views (sucesso, carregando, vazio e erro) |
| main/di | `<feature>.dependencies.ts` com `make<Feature>List()` |
| app | rota curta (`page.tsx` e `error.tsx`) |
| teste | teste do caso de uso, **se o Vitest já estiver instalado** |

Se a feature já existir, o script **não altera nada** e avisa.

## Depois de gerar

1. Troque os campos de exemplo (`id` e `name`) pelos reais, começando pelo `domain`.
2. Confira o nome da tabela no adaptador e crie a migration:
   ```bash
   scripts/arch/create-migration.sh create_<feature>_table
   ```
   Siga o checklist de [supabase.spec.md](supabase.spec.md): RLS, `grant` e policies.
3. Confirme que `src/infra/supabase/server-client.ts` existe (criado no card `FAP - 0003`).
4. Escreva ou ajuste o teste da regra do negócio.
5. Rode as verificações:
   ```bash
   npm run lint && npm run typecheck && npm run test && npm run build
   ```

## Migrations

```bash
scripts/arch/create-migration.sh <nome_em_snake_case>
```

Cria `supabase/migrations/AAAAMMDDHHMMSS_<nome>.sql` com um modelo seguro (RLS, `grant` e policy) comentado.

## Observações

- O scaffold gera uma base **propositalmente simples**. Ajuste os nomes e os contratos ao contexto da feature.
- Os scripts usam `src/` na raiz do projeto. A migração do app para `src/` faz parte do card `FAP - 0003`.
- Mantenha a page como orquestradora de cenários e a view como renderização de sucesso.
