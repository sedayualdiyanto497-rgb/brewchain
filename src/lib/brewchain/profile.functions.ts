import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireWalletAuth } from "./wallet-auth";

// Base58 alphabet (no 0, O, I, l). Solana wallet addresses are base58(32 bytes) → 32-44 chars.
const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]+$/;
const WalletAddressSchema = z
  .string()
  .trim()
  .min(32)
  .max(44)
  .regex(BASE58_RE, "wallet address must be base58");
const Base58SignatureSchema = z
  .string()
  .trim()
  .min(64)
  .max(128)
  .regex(BASE58_RE, "signature must be base58");
const SignInMessageSchema = z
  .string()
  .min(10)
  .max(500)
  // Defensive: reject control characters that could smuggle headers / log injection
  .regex(/^[\x20-\x7E\n\r\t]+$/, "message contains invalid characters");

const SignInSchema = z.object({
  walletAddress: WalletAddressSchema,
  message: SignInMessageSchema,
  signatureB58: Base58SignatureSchema,
});

/**
 * Verifies a Solana wallet's signMessage signature server-side using tweetnacl,
 * then upserts the profile row. Returns the verified wallet address.
 */
export const verifyWalletSignIn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SignInSchema.parse(d))
  .handler(async ({ data }) => {
    const nacl = (await import("tweetnacl")).default;
    const bs58 = (await import("bs58")).default;

    let pubkeyBytes: Uint8Array;
    let signatureBytes: Uint8Array;
    try {
      pubkeyBytes = bs58.decode(data.walletAddress);
      signatureBytes = bs58.decode(data.signatureB58);
    } catch {
      throw new Response("Invalid base58 payload", { status: 400 });
    }
    if (pubkeyBytes.length !== 32) throw new Response("Wallet address tidak valid", { status: 400 });
    if (signatureBytes.length !== 64) throw new Response("Signature length invalid", { status: 400 });
    const messageBytes = new TextEncoder().encode(data.message);
    const ok = nacl.sign.detached.verify(messageBytes, signatureBytes, pubkeyBytes);
    if (!ok) throw new Response("Tanda tangan tidak valid", { status: 401 });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          wallet_address: data.walletAddress,
          last_signed_at: new Date().toISOString(),
        },
        { onConflict: "wallet_address" },
      );

    await supabaseAdmin.from("notifications").insert({
      wallet_address: data.walletAddress,
      type: "wallet_connected",
      title: "Wallet terhubung",
      message: "Selamat datang kembali di BrewChain ☕",
    });

    // Mint a signed session token bound to the verified wallet.
    const { mintWalletToken } = await import("./wallet-session.server");
    const token = mintWalletToken(data.walletAddress);
    return { ok: true, walletAddress: data.walletAddress, token };
  });

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireWalletAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("wallet_address", context.walletAddress)
      .maybeSingle();
    return profile;
  });

const NicknameSchema = z.object({
  nickname: z.string().trim().min(2).max(40),
});

export const updateNickname = createServerFn({ method: "POST" })
  .middleware([requireWalletAuth])
  .inputValidator((d: unknown) => NicknameSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ nickname: data.nickname })
      .eq("wallet_address", context.walletAddress);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getNotifications = createServerFn({ method: "GET" })
  .middleware([requireWalletAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("notifications")
      .select("*")
      .eq("wallet_address", context.walletAddress)
      .order("created_at", { ascending: false })
      .limit(30);
    return rows ?? [];
  });

/** Returns the caller's admin/cashier role, or null. */
export const getMyRole = createServerFn({ method: "GET" })
  .middleware([requireWalletAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("app_roles")
      .select("role")
      .eq("wallet_address", context.walletAddress);
    const roles = (data ?? []).map((r) => r.role);
    return {
      walletAddress: context.walletAddress,
      roles,
      isAdmin: roles.includes("admin"),
      isStaff: roles.includes("admin") || roles.includes("cashier"),
      sessionExpiresAt: context.sessionExpiresAt,
    };
  });

/** Lightweight endpoint to check session validity + expiry from the client. */
export const getSessionInfo = createServerFn({ method: "GET" })
  .middleware([requireWalletAuth])
  .handler(async ({ context }) => ({
    walletAddress: context.walletAddress,
    sessionExpiresAt: context.sessionExpiresAt,
  }));