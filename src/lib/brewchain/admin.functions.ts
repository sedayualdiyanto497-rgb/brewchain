import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdminWallet } from "./wallet-auth";
import { recordAuditEvent } from "./audit.server";

// ---------------- Products CRUD ----------------
const ProductInputSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(120).regex(/^[a-z0-9-]+$/),
  description: z.string().max(2000).optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  price_idr: z.number().int().nonnegative(),
  price_sol: z.number().nonnegative(),
  stock: z.number().int().nonnegative(),
  image_url: z.string().url().optional().nullable(),
  is_bestseller: z.boolean().optional(),
  promo_pct: z.number().int().min(0).max(90).optional(),
  is_active: z.boolean().optional(),
});

export const adminListProducts = createServerFn({ method: "GET" })
  .middleware([requireAdminWallet])
  .handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("products")
    .select("*, categories(name)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const createProduct = createServerFn({ method: "POST" })
  .middleware([requireAdminWallet])
  .inputValidator((d: unknown) => ProductInputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.from("products").insert(data).select().single();
    if (error) throw new Error(error.message);
    await recordAuditEvent({
      actorWallet: context.walletAddress, actorRole: context.role,
      action: "product.create", targetType: "product", targetId: row?.id ?? null,
      meta: { name: data.name, slug: data.slug },
    });
    return row;
  });

export const updateProduct = createServerFn({ method: "POST" })
  .middleware([requireAdminWallet])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).merge(ProductInputSchema.partial()).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...patch } = data;
    const { error } = await supabaseAdmin.from("products").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    await recordAuditEvent({
      actorWallet: context.walletAddress, actorRole: context.role,
      action: "product.update", targetType: "product", targetId: id,
      meta: { fields: Object.keys(patch) },
    });
    return { ok: true };
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireAdminWallet])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // soft delete by deactivating to preserve referential integrity in order_items
    const { error } = await supabaseAdmin.from("products").update({ is_active: false }).eq("id", data.id);
    if (error) throw new Error(error.message);
    await recordAuditEvent({
      actorWallet: context.walletAddress, actorRole: context.role,
      action: "product.delete", targetType: "product", targetId: data.id,
    });
    return { ok: true };
  });

// ---------------- Vouchers CRUD ----------------
const VoucherInputSchema = z.object({
  code: z.string().trim().toUpperCase().min(2).max(40),
  description: z.string().max(300).optional().nullable(),
  discount_pct: z.number().int().min(1).max(90),
  min_order_idr: z.number().int().nonnegative().default(0),
  max_uses: z.number().int().positive().default(100),
  expires_at: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
});

export const adminListVouchers = createServerFn({ method: "GET" })
  .middleware([requireAdminWallet])
  .handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("vouchers")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const createVoucher = createServerFn({ method: "POST" })
  .middleware([requireAdminWallet])
  .inputValidator((d: unknown) => VoucherInputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.from("vouchers").insert(data).select().single();
    if (error) throw new Error(error.message);
    await recordAuditEvent({
      actorWallet: context.walletAddress, actorRole: context.role,
      action: "voucher.create", targetType: "voucher", targetId: row?.id ?? null,
      meta: { code: data.code, discount_pct: data.discount_pct },
    });
    return row;
  });

export const updateVoucher = createServerFn({ method: "POST" })
  .middleware([requireAdminWallet])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).merge(VoucherInputSchema.partial()).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...patch } = data;
    const { error } = await supabaseAdmin.from("vouchers").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    await recordAuditEvent({
      actorWallet: context.walletAddress, actorRole: context.role,
      action: "voucher.update", targetType: "voucher", targetId: id,
      meta: { fields: Object.keys(patch) },
    });
    return { ok: true };
  });

export const deleteVoucher = createServerFn({ method: "POST" })
  .middleware([requireAdminWallet])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("vouchers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await recordAuditEvent({
      actorWallet: context.walletAddress, actorRole: context.role,
      action: "voucher.delete", targetType: "voucher", targetId: data.id,
    });
    return { ok: true };
  });

// ---------------- Audit log (admin-only read) ----------------
export const adminListAuditLog = createServerFn({ method: "GET" })
  .middleware([requireAdminWallet])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("admin_audit_log" as never)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []) as Array<{
      id: string; actor_wallet: string; actor_role: string | null;
      action: string; target_type: string | null; target_id: string | null;
      meta: Record<string, unknown>; created_at: string;
    }>;
  });

// ---------------- Membership listing (read-only) ----------------
export const adminListMemberships = createServerFn({ method: "GET" })
  .middleware([requireAdminWallet])
  .handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("memberships").select("*").order("min_spend_idr");
  if (error) throw new Error(error.message);
  return data ?? [];
});
