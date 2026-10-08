#!/usr/bin/env bash
# Gera a base de uma feature do frontend no padrão de docs/architecture/frontend.spec.md.
# Uso: scripts/arch/create-feature-web.sh <feature-em-kebab-case> [EntidadeNoSingular]
# Exemplo: scripts/arch/create-feature-web.sh books Book
# Variável opcional: ROOT=<pasta do projeto> (padrão: raiz do repositório)
set -euo pipefail

FEATURE="${1:-}"
if [[ ! "$FEATURE" =~ ^[a-z][a-z0-9]*(-[a-z0-9]+)*$ ]]; then
  echo "Uso: $0 <feature-em-kebab-case> [EntidadeNoSingular]   (ex.: books Book)" >&2
  exit 1
fi

ROOT="${ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
SRC="$ROOT/src"

pascal() { echo "$1" | awk -F- '{ for (i=1;i<=NF;i++) printf toupper(substr($i,1,1)) substr($i,2) }'; }
PLURAL="$(pascal "$FEATURE")"
if [[ -n "${2:-}" ]]; then
  ENTITY="$2"
else
  ENTITY="${PLURAL%s}"
  [[ "$ENTITY" == "$PLURAL" ]] && ENTITY="${PLURAL}Item"
fi

if [[ -d "$SRC/domain/$FEATURE" ]]; then
  echo "A feature '$FEATURE' já existe em $SRC/domain/$FEATURE. Nada foi alterado." >&2
  exit 1
fi

mk() { mkdir -p "$(dirname "$1")"; cat > "$1"; }

# ---------- domain ----------
mk "$SRC/domain/$FEATURE/entities/$FEATURE.entity.ts" <<EOF
// Entidade: o "molde" de uma coisa do negócio. Troque os campos pelos reais.
export type $ENTITY = {
  id: string;
  name: string;
};
EOF

mk "$SRC/domain/$FEATURE/repositories/$FEATURE.repository.ts" <<EOF
import type { $ENTITY } from "../entities/$FEATURE.entity";

// Contrato: o que precisa existir para buscar/salvar. Quem cumpre é a camada data.
export interface ${PLURAL}Repository {
  list(): Promise<$ENTITY[]>;
}
EOF

mk "$SRC/domain/$FEATURE/usecases/list-$FEATURE.usecase.ts" <<EOF
import type { $ENTITY } from "../entities/$FEATURE.entity";
import type { ${PLURAL}Repository } from "../repositories/$FEATURE.repository";

// Caso de uso: uma ação do usuário. Regras do negócio entram aqui (ou na entidade).
export class List${PLURAL}UseCase {
  private readonly repository: ${PLURAL}Repository;

  constructor(repository: ${PLURAL}Repository) {
    this.repository = repository;
  }

  execute(): Promise<$ENTITY[]> {
    return this.repository.list();
  }
}
EOF

# ---------- data ----------
mk "$SRC/data/$FEATURE/models/$FEATURE.model.ts" <<EOF
// Model: o formato do dado como vem do banco (nomes das colunas).
export type ${ENTITY}Model = {
  id: string;
  name: string;
};
EOF

mk "$SRC/data/$FEATURE/mappers/$FEATURE.mapper.ts" <<EOF
import type { $ENTITY } from "@/domain/$FEATURE/entities/$FEATURE.entity";
import type { ${ENTITY}Model } from "../models/$FEATURE.model";

// Mapper: converte o formato do banco para o formato do sistema.
export function to${ENTITY}(model: ${ENTITY}Model): $ENTITY {
  return { id: model.id, name: model.name };
}
EOF

mk "$SRC/data/$FEATURE/repositories/$FEATURE.repository-impl.ts" <<EOF
import type { $ENTITY } from "@/domain/$FEATURE/entities/$FEATURE.entity";
import type { ${PLURAL}Repository } from "@/domain/$FEATURE/repositories/$FEATURE.repository";
import type { ${PLURAL}SupabaseAdapter } from "@/infra/adapters/$FEATURE/$FEATURE-supabase.adapter";
import { to${ENTITY} } from "../mappers/$FEATURE.mapper";

// Cumpre o contrato do domain usando o adaptador da infra.
export class ${PLURAL}RepositoryImpl implements ${PLURAL}Repository {
  private readonly adapter: ${PLURAL}SupabaseAdapter;

  constructor(adapter: ${PLURAL}SupabaseAdapter) {
    this.adapter = adapter;
  }

  async list(): Promise<$ENTITY[]> {
    const models = await this.adapter.fetchAll();
    return models.map(to${ENTITY});
  }
}
EOF

# ---------- infra ----------
mk "$SRC/infra/adapters/$FEATURE/$FEATURE-supabase.adapter.ts" <<EOF
import type { ${ENTITY}Model } from "@/data/$FEATURE/models/$FEATURE.model";

// Só o pedaço do Supabase de que este adaptador precisa (evita acoplar ao SDK inteiro).
type QueryResult = { data: unknown[] | null; error: { message: string } | null };
export type SupabaseLike = {
  from(table: string): { select(columns: string): PromiseLike<QueryResult> };
};

// Adaptador: o único lugar da feature que conversa com o Supabase.
export class ${PLURAL}SupabaseAdapter {
  private readonly getClient: () => Promise<SupabaseLike> | SupabaseLike;

  constructor(getClient: () => Promise<SupabaseLike> | SupabaseLike) {
    this.getClient = getClient;
  }

  async fetchAll(): Promise<${ENTITY}Model[]> {
    const client = await this.getClient();
    const { data, error } = await client.from("$(echo "$FEATURE" | tr '-' '_')").select("id, name");
    if (error) throw new Error(error.message);
    return (data ?? []) as ${ENTITY}Model[];
  }
}
EOF

# ---------- presenter ----------
mk "$SRC/presenter/$FEATURE/$FEATURE.state.ts" <<EOF
import type { $ENTITY } from "@/domain/$FEATURE/entities/$FEATURE.entity";

// Estado da tela: um tipo por cenário.
export type ${PLURAL}State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty" }
  | { status: "success"; items: $ENTITY[] };
EOF

mk "$SRC/presenter/$FEATURE/$FEATURE.actions.ts" <<EOF
"use server";

import { revalidatePath } from "next/cache";

// Server Actions: funções de escrita executadas no servidor.
// Exemplo: depois de salvar algo, peça ao Next.js para recarregar a rota.
export async function refresh${PLURAL}() {
  revalidatePath("/$FEATURE");
}
EOF

# ---------- modules ----------
mk "$SRC/modules/$FEATURE/page/$FEATURE-page.tsx" <<EOF
import { Suspense } from "react";
import { make${PLURAL}List } from "@/main/di/$FEATURE.dependencies";
import { ${PLURAL}EmptyView } from "./view/$FEATURE-empty-view";
import { ${PLURAL}LoadingView } from "./view/$FEATURE-loading-view";
import { ${PLURAL}View } from "./view/$FEATURE-view";

// A page decide o cenário: carregando, vazio ou sucesso. O erro vai para o error.tsx da rota.
async function ${PLURAL}Content() {
  const items = await make${PLURAL}List().execute();
  if (items.length === 0) return <${PLURAL}EmptyView />;
  return <${PLURAL}View items={items} />;
}

export function ${PLURAL}Page() {
  return (
    <Suspense fallback={<${PLURAL}LoadingView />}>
      <${PLURAL}Content />
    </Suspense>
  );
}
EOF

mk "$SRC/modules/$FEATURE/page/view/$FEATURE-view.tsx" <<EOF
import type { $ENTITY } from "@/domain/$FEATURE/entities/$FEATURE.entity";

// A view só desenha o caso de sucesso. Recebe tudo por props.
export function ${PLURAL}View({ items }: { items: $ENTITY[] }) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
}
EOF

mk "$SRC/modules/$FEATURE/page/view/$FEATURE-loading-view.tsx" <<EOF
export function ${PLURAL}LoadingView() {
  return <p>Carregando…</p>;
}
EOF

mk "$SRC/modules/$FEATURE/page/view/$FEATURE-empty-view.tsx" <<EOF
export function ${PLURAL}EmptyView() {
  return <p>Nada por aqui ainda.</p>;
}
EOF

mk "$SRC/modules/$FEATURE/page/view/$FEATURE-error-view.tsx" <<EOF
export function ${PLURAL}ErrorView({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert">
      <p>Não foi possível carregar.</p>
      <button type="button" onClick={onRetry}>
        Tentar de novo
      </button>
    </div>
  );
}
EOF

mkdir -p "$SRC/modules/$FEATURE/widgets"
touch "$SRC/modules/$FEATURE/widgets/.gitkeep"

# ---------- main/di ----------
mk "$SRC/main/di/$FEATURE.dependencies.ts" <<EOF
import { createServerClient } from "@/infra/supabase/server-client";
import { ${PLURAL}SupabaseAdapter } from "@/infra/adapters/$FEATURE/$FEATURE-supabase.adapter";
import { ${PLURAL}RepositoryImpl } from "@/data/$FEATURE/repositories/$FEATURE.repository-impl";
import { List${PLURAL}UseCase } from "@/domain/$FEATURE/usecases/list-$FEATURE.usecase";

// Montagem: cria o adaptador, o repositório e devolve o caso de uso pronto.
export function make${PLURAL}List() {
  const adapter = new ${PLURAL}SupabaseAdapter(createServerClient);
  const repository = new ${PLURAL}RepositoryImpl(adapter);
  return new List${PLURAL}UseCase(repository);
}
EOF

# ---------- app (rota) ----------
mk "$SRC/app/$FEATURE/page.tsx" <<EOF
import { ${PLURAL}Page } from "@/modules/$FEATURE/page/$FEATURE-page";

// A rota é curta: só chama a page do módulo.
export default function Page() {
  return <${PLURAL}Page />;
}
EOF

mk "$SRC/app/$FEATURE/error.tsx" <<EOF
"use client";

import { ${PLURAL}ErrorView } from "@/modules/$FEATURE/page/view/$FEATURE-error-view";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return <${PLURAL}ErrorView onRetry={reset} />;
}
EOF

# ---------- teste ----------
if grep -q '"vitest"' "$ROOT/package.json" 2>/dev/null; then
  mk "$SRC/domain/$FEATURE/usecases/list-$FEATURE.usecase.test.ts" <<EOF
import { describe, expect, it } from "vitest";
import type { ${PLURAL}Repository } from "../repositories/$FEATURE.repository";
import { List${PLURAL}UseCase } from "./list-$FEATURE.usecase";

describe("List${PLURAL}UseCase", () => {
  it("devolve o que o repositório entrega", async () => {
    const repository: ${PLURAL}Repository = {
      list: async () => [{ id: "1", name: "Exemplo" }],
    };
    const items = await new List${PLURAL}UseCase(repository).execute();
    expect(items).toEqual([{ id: "1", name: "Exemplo" }]);
  });
});
EOF
  TESTE="criado"
else
  TESTE="não criado (instale o Vitest primeiro)"
fi

cat <<EOF

Feature '$FEATURE' criada em $SRC (entidade: $ENTITY).
Teste do caso de uso: $TESTE.

Próximos passos:
  1. Troque os campos de exemplo pelos reais, começando pelo domain.
  2. Confirme o nome da tabela no adaptador e crie a migration:
       scripts/arch/create-migration.sh create_$(echo "$FEATURE" | tr '-' '_')_table
  3. Garanta que src/infra/supabase/server-client.ts existe (card FAP - 0003).
  4. Rode: npm run lint && npm run typecheck && npm run test && npm run build
EOF
