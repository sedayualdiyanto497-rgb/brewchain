import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const CartItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive().max(99),
});

const CreateOrderSchema = z.object({
  walletAddress: z.string(),
  items: z.array(CartItemSchema).min(1).max(20),
  voucherCode: z.string().trim().toUpperCase().optional().nullable(),
  paymentMethod: z.enum(["solana", "qris", "bank_transfer"]).default("solana"),
  notes: z.string().max(300).optional(),
});

function generateOrderNumber() {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `BRW-${stamp}-${rand}`;
}

export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => CreateOrderSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // fetch products to compute server-side prices
    const productIds = data.items.map((i) => i.productId);
    const { data: products, error: pErr } = await supabaseAdmin
      .from("products")
      .select("id, name, price_idr, price_sol, stock, is_active")
      .in("id", productIds);
    if (pErr) throw new Error(pErr.message);
    if (!products || products.length !== productIds.length) throw new Error("Produk tidak valid");

    let subtotalIdr = 0;
    let totalSol = 0;
    const itemsForInsert: Array<{
      product_id: string;
      product_name: string;
      unit_price_idr: number;
      quantity: number;
      subtotal_idr: number;
    }> = [];

    for (const item of data.items) {
      const p = products.find((x) => x.id === item.productId);
      if (!p || !p.is_active) throw new Error("Produk tidak aktif");
      if (p.stock < item.quantity) throw new Error(`Stok ${p.name} tidak cukup`);
      const lineIdr = p.price_idr * item.quantity;
      subtotalIdr += lineIdr;
      totalSol += Number(p.price_sol) * item.quantity;
      itemsForInsert.push({
        product_id: p.id,
        product_name: p.name,
        unit_price_idr: p.price_idr,
        quantity: item.quantity,
        subtotal_idr: lineIdr,
      });
    }

    // voucher
    let discountIdr = 0;
    let voucherCode: string | null = null;
    if (data.voucherCode) {
      const { data: v } = await supabaseAdmin
        .from("vouchers")
        .select("*")
        .eq("code", data.voucherCode)
        .eq("is_active", true)
        .maybeSingle();
      if (v) {
        const validExp = !v.expires_at || new Date(v.expires_at) > new Date();
        const validUses = v.used_count < v.max_uses;
        const validMin = subtotalIdr >= v.min_order_idr;
        if (validExp && validUses && validMin) {
          discountIdr = Math.round((subtotalIdr * v.discount_pct) / 100);
          voucherCode = v.code;
        }
      }
    }

    const taxIdr = Math.round((subtotalIdr - discountIdr) * 0.1);
    const totalIdr = subtotalIdr - discountIdr + taxIdr;

    const orderNumber = generateOrderNumber();
    const { data: order, error: oErr } = await supabaseAdmin
      .from("orders")
      .insert({
        order_number: orderNumber,
        wallet_address: data.walletAddress,
        subtotal_idr: subtotalIdr,
        discount_idr: discountIdr,
        tax_idr: taxIdr,
        total_idr: totalIdr,
        total_sol: Number(totalSol.toFixed(6)),
        voucher_code: voucherCode,
        payment_method: data.paymentMethod,
        status: "pending",
        notes: data.notes ?? null,
      })
      .select()
      .single();
    if (oErr || !order) throw new Error(oErr?.message ?? "Gagal membuat pesanan");

    const { error: itemsErr } = await supabaseAdmin
      .from("order_items")
      .insert(itemsForInsert.map((i) => ({ ...i, order_id: order.id })));
    if (itemsErr) throw new Error(itemsErr.message);

    // decrement stock
    for (const it of itemsForInsert) {
      const p = products.find((x) => x.id === it.product_id)!;
      await supabaseAdmin
        .from("products")
        .update({ stock: p.stock - it.quantity })
        .eq("id", p.id);
    }

    if (voucherCode) {
      const { data: cur } = await supabaseAdmin
        .from("vouchers")
        .select("used_count")
        .eq("code", voucherCode)
        .maybeSingle();
      if (cur) {
        await supabaseAdmin
          .from("vouchers")
          .update({ used_count: cur.used_count + 1 })
          .eq("code", voucherCode);
      }
    }

    return order;
  });

const RecordTxSchema = z.object({
  orderId: z.string().uuid(),
  walletAddress: z.string(),
  recipientAddress: z.string(),
  txSignature: z.string().min(10).max(200),
  totalSol: z.number().positive(),
  blockTime: z.number().nullable().optional(),
});

export const recordBlockchainTransaction = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => RecordTxSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const explorerUrl = `https://explorer.solana.com/tx/${data.txSignature}?cluster=devnet`;

    const { error: txErr } = await supabaseAdmin.from("transactions").insert({
      order_id: data.orderId,
      wallet_address: data.walletAddress,
      recipient_address: data.recipientAddress,
      tx_signature: data.txSignature,
      block_time: data.blockTime ?? null,
      total_sol: data.totalSol,
      status: "confirmed",
      explorer_url: explorerUrl,
      network: "devnet",
    });
    if (txErr) throw new Error(txErr.message);

    await supabaseAdmin.from("orders").update({ status: "paid" }).eq("id", data.orderId);

    // loyalty: 1 point per Rp 10.000
    const { data: ord } = await supabaseAdmin
      .from("orders")
      .select("total_idr, wallet_address")
      .eq("id", data.orderId)
      .maybeSingle();
    if (ord) {
      const points = Math.floor(ord.total_idr / 10000);
      await supabaseAdmin.from("loyalty_ledger").insert({
        wallet_address: ord.wallet_address,
        order_id: data.orderId,
        points,
        reason: "Pembayaran on-chain",
      });
      const { data: prof } = await supabaseAdmin
        .from("profiles")
        .select("total_points, total_orders, total_spent_idr")
        .eq("wallet_address", ord.wallet_address)
        .maybeSingle();
      const totalSpent = (prof?.total_spent_idr ?? 0) + ord.total_idr;
      const totalPoints = (prof?.total_points ?? 0) + points;
      const totalOrders = (prof?.total_orders ?? 0) + 1;
      // level threshold
      let level: "bronze" | "silver" | "gold" | "platinum" = "bronze";
      if (totalSpent >= 5_000_000) level = "platinum";
      else if (totalSpent >= 1_500_000) level = "gold";
      else if (totalSpent >= 500_000) level = "silver";
      await supabaseAdmin
        .from("profiles")
        .upsert(
          {
            wallet_address: ord.wallet_address,
            total_points: totalPoints,
            total_orders: totalOrders,
            total_spent_idr: totalSpent,
            membership_level: level,
          },
          { onConflict: "wallet_address" },
        );
    }

    await supabaseAdmin.from("notifications").insert({
      wallet_address: data.walletAddress,
      type: "payment_success",
      title: "Pembayaran berhasil",
      message: `Transaksi ${data.txSignature.slice(0, 8)}… tercatat di Solana Devnet`,
    });

    return { explorerUrl };
  });

// ---------- Demo Wallet Payment ----------
// Simulates a Solana Devnet payment without requiring real SOL / wallet signature.
// Generates a plausible-looking signature, records a transaction row with network="devnet-demo",
// updates order status, and awards loyalty points (same as real flow).
function fakeSignature() {
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let s = "";
  for (let i = 0; i < 88; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

const DemoPaySchema = z.object({
  orderId: z.string().uuid(),
  walletAddress: z.string(),
});

export const payOrderDemo = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => DemoPaySchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order) throw new Error("Order tidak ditemukan");
    if (order.status !== "pending") throw new Error("Order sudah diproses");

    const signature = `demo_${fakeSignature()}`;
    const explorerUrl = `https://explorer.solana.com/?cluster=devnet`;

    const { error: txErr } = await supabaseAdmin.from("transactions").insert({
      order_id: data.orderId,
      wallet_address: data.walletAddress,
      recipient_address: "DEMO_MERCHANT_WALLET_SIMULATED",
      tx_signature: signature,
      block_time: Math.floor(Date.now() / 1000),
      total_sol: Number(order.total_sol),
      status: "confirmed",
      explorer_url: explorerUrl,
      network: "devnet-demo",
    });
    if (txErr) throw new Error(txErr.message);

    await supabaseAdmin.from("orders").update({ status: "paid" }).eq("id", data.orderId);

    const points = Math.floor(order.total_idr / 10000);
    await supabaseAdmin.from("loyalty_ledger").insert({
      wallet_address: order.wallet_address,
      order_id: data.orderId,
      points,
      reason: "Pembayaran demo wallet",
    });
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("total_points, total_orders, total_spent_idr")
      .eq("wallet_address", order.wallet_address)
      .maybeSingle();
    const totalSpent = (prof?.total_spent_idr ?? 0) + order.total_idr;
    const totalPoints = (prof?.total_points ?? 0) + points;
    const totalOrders = (prof?.total_orders ?? 0) + 1;
    let level: "bronze" | "silver" | "gold" | "platinum" = "bronze";
    if (totalSpent >= 5_000_000) level = "platinum";
    else if (totalSpent >= 1_500_000) level = "gold";
    else if (totalSpent >= 500_000) level = "silver";
    await supabaseAdmin.from("profiles").upsert(
      {
        wallet_address: order.wallet_address,
        total_points: totalPoints,
        total_orders: totalOrders,
        total_spent_idr: totalSpent,
        membership_level: level,
      },
      { onConflict: "wallet_address" },
    );

    await supabaseAdmin.from("notifications").insert({
      wallet_address: order.wallet_address,
      type: "payment_success",
      title: "Pembayaran demo berhasil",
      message: `Demo tx ${signature.slice(0, 12)}… tercatat sebagai pembayaran simulasi.`,
    });

    return { signature, explorerUrl };
  });

// ---------- Admin: list all orders ----------
export const listAllOrders = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("*, transactions(*), order_items(*)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return data ?? [];
});

// ---------- Admin: verify blockchain payment (mark transaction as verified) ----------
const VerifyPaymentSchema = z.object({ orderId: z.string().uuid() });
export const verifyPayment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => VerifyPaymentSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("transactions")
      .update({ status: "confirmed" })
      .eq("order_id", data.orderId);
    await supabaseAdmin
      .from("orders")
      .update({ status: "preparing" })
      .eq("id", data.orderId);
    const { data: ord } = await supabaseAdmin
      .from("orders")
      .select("wallet_address, order_number")
      .eq("id", data.orderId)
      .maybeSingle();
    if (ord) {
      await supabaseAdmin.from("notifications").insert({
        wallet_address: ord.wallet_address,
        type: "payment_success",
        title: "Pembayaran terverifikasi",
        message: `Pesanan ${ord.order_number} telah diverifikasi admin & masuk antrian peracikan.`,
      });
    }
    return { ok: true };
  });

export const listOrders = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ walletAddress: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("orders")
      .select("*, transactions(*), order_items(*)")
      .eq("wallet_address", data.walletAddress)
      .order("created_at", { ascending: false })
      .limit(50);
    return rows ?? [];
  });

export const getOrder = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("*, transactions(*), order_items(*)")
      .eq("id", data.orderId)
      .maybeSingle();
    return order;
  });

const UpdateStatusSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(["pending", "paid", "preparing", "ready", "completed", "cancelled"]),
});

export const updateOrderStatus = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => UpdateStatusSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: ord } = await supabaseAdmin
      .from("orders")
      .select("wallet_address")
      .eq("id", data.orderId)
      .maybeSingle();
    await supabaseAdmin.from("orders").update({ status: data.status }).eq("id", data.orderId);
    if (ord) {
      const titleMap: Record<typeof data.status, string> = {
        pending: "Pesanan menunggu pembayaran",
        paid: "Pembayaran diterima",
        preparing: "Pesanan sedang diracik ☕",
        ready: "Pesanan siap diambil 🎉",
        completed: "Pesanan selesai",
        cancelled: "Pesanan dibatalkan",
      };
      await supabaseAdmin.from("notifications").insert({
        wallet_address: ord.wallet_address,
        type: data.status === "preparing" ? "preparing" : data.status === "ready" ? "ready" : data.status === "completed" ? "completed" : "order_accepted",
        title: titleMap[data.status],
        message: `Status pesanan diperbarui menjadi ${data.status}.`,
      });
    }
    return { ok: true };
  });

export const adminStats = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ count: totalOrders }, { count: totalCustomers }, { count: totalProducts }, { count: totalTx }, { data: orders }] = await Promise.all([
    supabaseAdmin.from("orders").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("products").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("transactions").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("orders").select("total_idr, created_at, status, payment_method").order("created_at", { ascending: false }).limit(200),
  ]);
  const revenue = (orders ?? []).filter((o) => o.status !== "cancelled" && o.status !== "pending").reduce((s, o) => s + o.total_idr, 0);
  return {
    totalOrders: totalOrders ?? 0,
    totalCustomers: totalCustomers ?? 0,
    totalProducts: totalProducts ?? 0,
    totalTx: totalTx ?? 0,
    revenue,
    orders: orders ?? [],
  };
});