#!/usr/bin/env bash
# Gera a base de uma feature no Nível 1 (estrutura do professor): types, service, componente e rota.
# Regras em docs/architecture/frontend.spec.md
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
TABLE="$(echo "$FEATURE" | tr '-' '_')"

if [[ -e "$SRC/services/$FEATURE.service.ts" || -d "$SRC/app/$FEATURE" ]]; then
  echo "A feature '$FEATURE' já existe (service ou rota). Nada foi alterado." >&2
  exit 1
fi

mk() { mkdir -p "$(dirname "$1")"; cat > "$1"; }

mk "$SRC/types/$FEATURE.ts" <<EOF
// Tipo: descreve o formato do dado. Troque os campos pelos reais.
export type $ENTITY = {
  id: string;
  name: string;
};
EOF

mk "$SRC/services/$FEATURE.service.ts" <<EOF
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import type { $ENTITY } from "@/types/$FEATURE";

// Service: só aqui a feature fala com o Supabase.
// Troque "$TABLE" e as colunas pelas da sua tabela.
export async function list${PLURAL}(): Promise<$ENTITY[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("$TABLE").select("id, name");

  if (error) throw new Error(error.message);
  return data ?? [];
}
EOF

mk "$SRC/components/${PLURAL}List.tsx" <<EOF
import type { $ENTITY } from "@/types/$FEATURE";

interface ${PLURAL}ListProps {
  items: $ENTITY[];
}

// Componente: só desenha. Recebe tudo por props e não busca dados.
export function ${PLURAL}List({ items }: ${PLURAL}ListProps) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
}
EOF

# Reexporta no index.tsx (como no projeto do professor), sem duplicar.
INDEX="$SRC/components/index.tsx"
if [[ -f "$INDEX" ]]; then
  grep -q "${PLURAL}List" "$INDEX" || echo "export { ${PLURAL}List } from \"./${PLURAL}List\";" >> "$INDEX"
else
  echo "export { ${PLURAL}List } from \"./${PLURAL}List\";" > "$INDEX"
fi

mk "$SRC/app/$FEATURE/page.tsx" <<EOF
import { ${PLURAL}List } from "@/components";
import { list${PLURAL} } from "@/services/$FEATURE.service";

// A página busca os dados no servidor e decide: vazio ou sucesso.
// Carregando é o loading.tsx; erro é o error.tsx (mesma pasta).
export default async function ${PLURAL}Page() {
  const items = await list${PLURAL}();

  if (items.length === 0) {
    return <p>Nada por aqui ainda.</p>;
  }

  return <${PLURAL}List items={items} />;
}
EOF

mk "$SRC/app/$FEATURE/loading.tsx" <<EOF
export default function Loading() {
  return <p>Carregando…</p>;
}
EOF

mk "$SRC/app/$FEATURE/error.tsx" <<EOF
"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert">
      <p>Não foi possível carregar.</p>
      <button type="button" onClick={reset}>
        Tentar de novo
      </button>
    </div>
  );
}
EOF

cat <<EOF

Feature '$FEATURE' criada em $SRC (tipo: $ENTITY).

Próximos passos:
  1. Troque os campos de exemplo pelos reais em src/types/$FEATURE.ts.
  2. Crie a migration da tabela e confira RLS e grant:
       scripts/arch/create-migration.sh create_${TABLE}_table
  3. Garanta que src/lib/supabase/server-client.ts existe (card FAP - 0003).
  4. Se houver regra do negócio, crie src/domain/$FEATURE/ com testes (Nível 2).
  5. Rode: npm run lint && npm run typecheck && npm run build
EOF
