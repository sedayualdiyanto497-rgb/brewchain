import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const listCategories = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("categories")
    .select("*")
    .order("sort_order");
  return data ?? [];
});

export const listProducts = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("products")
    .select("*, categories(name, slug, icon)")
    .eq("is_active", true)
    .order("is_bestseller", { ascending: false })
    .order("created_at", { ascending: false });
  return data ?? [];
});

export const getProductBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: product } = await supabaseAdmin
      .from("products")
      .select("*, categories(name, slug, icon)")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!product) return null;
    const { data: reviews } = await supabaseAdmin
      .from("reviews")
      .select("*")
      .eq("product_id", product.id)
      .order("created_at", { ascending: false })
      .limit(10);
    const { data: related } = await supabaseAdmin
      .from("products")
      .select("id, name, slug, image_url, price_idr, rating_avg")
      .eq("is_active", true)
      .neq("id", product.id)
      .eq("category_id", product.category_id ?? "")
      .limit(4);
    return { product, reviews: reviews ?? [], related: related ?? [] };
  });

export const listVouchers = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("vouchers")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  return data ?? [];
});

export const listMemberships = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("memberships").select("*").order("min_spend_idr");
  return data ?? [];
});

const WishlistToggleSchema = z.object({
  walletAddress: z.string(),
  productId: z.string().uuid(),
});

export const toggleWishlist = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => WishlistToggleSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("wishlist")
      .select("id")
      .eq("wallet_address", data.walletAddress)
      .eq("product_id", data.productId)
      .maybeSingle();
    if (existing) {
      await supabaseAdmin.from("wishlist").delete().eq("id", existing.id);
      return { added: false };
    }
    await supabaseAdmin.from("wishlist").insert({
      wallet_address: data.walletAddress,
      product_id: data.productId,
    });
    return { added: true };
  });

export const getWishlist = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ walletAddress: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("wishlist")
      .select("product:products(id, name, slug, image_url, price_idr, rating_avg)")
      .eq("wallet_address", data.walletAddress);
    return (rows ?? []).map((r) => r.product).filter(Boolean);
  });

const AddReviewSchema = z.object({
  walletAddress: z.string(),
  productId: z.string().uuid(),
  orderId: z.string().uuid().optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

export const addReview = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => AddReviewSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("reviews").insert({
      product_id: data.productId,
      wallet_address: data.walletAddress,
      order_id: data.orderId ?? null,
      rating: data.rating,
      comment: data.comment ?? null,
    });
    if (error) throw new Error(error.message);
    // recompute rating
    const { data: agg } = await supabaseAdmin
      .from("reviews")
      .select("rating")
      .eq("product_id", data.productId);
    const arr = agg ?? [];
    const avg = arr.length ? arr.reduce((s, r) => s + r.rating, 0) / arr.length : 0;
    await supabaseAdmin
      .from("products")
      .update({ rating_avg: Number(avg.toFixed(2)), rating_count: arr.length })
      .eq("id", data.productId);
    return { ok: true };
  });