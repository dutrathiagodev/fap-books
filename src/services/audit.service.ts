import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export type AuditAction = "book_deleted" | "book_inactivated";

// Registra quem fez o quê. O banco só aceita ações conhecidas e "details" só com ids (LGPD, FAP-0011).
// Se a gravação falhar, a ação já feita não é desfeita: o erro fica no log do servidor.
export async function recordAudit(entry: {
  actorId: string;
  action: AuditAction;
  entity: "books";
  entityId: string;
}): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("audit_logs").insert({
    actor_id: entry.actorId,
    action: entry.action,
    entity: entry.entity,
    entity_id: entry.entityId,
    details: { book_id: entry.entityId },
  });
  if (error) console.error("Falha ao gravar a auditoria:", error.message);
}
