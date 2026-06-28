import type { Json } from "@/integrations/supabase/types";

export type AuditAction =
  | "order.verify_payment"
  | "order.status_change"
  | "product.create"
  | "product.update"
  | "product.delete"
  | "voucher.create"
  | "voucher.update"
  | "voucher.delete";

export type AuditEntry = {
  actorWallet: string;
  actorRole?: string | null;
  action: AuditAction;
  targetType?: string | null;
  targetId?: string | null;
  meta?: Record<string, unknown>;
};

/** Persist an admin audit entry. Never throws — auditing must not break the user action. */
export async function recordAuditEvent(entry: AuditEntry): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("admin_audit_log" as never).insert({
      actor_wallet: entry.actorWallet,
      actor_role: entry.actorRole ?? null,
      action: entry.action,
      target_type: entry.targetType ?? null,
      target_id: entry.targetId ?? null,
      meta: (entry.meta ?? {}) as unknown as Json,
    } as never);
  } catch (e) {
    console.warn("[audit] failed to record entry", entry.action, (e as Error)?.message);
  }
}