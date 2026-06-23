import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SignInSchema = z.object({
  walletAddress: z.string().min(32).max(64),
  message: z.string().min(10).max(500),
  signatureB58: z.string().min(10).max(200),
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
    const { PublicKey } = await import("@solana/web3.js");

    const pubkey = new PublicKey(data.walletAddress);
    const messageBytes = new TextEncoder().encode(data.message);
    const signatureBytes = bs58.decode(data.signatureB58);
    const ok = nacl.sign.detached.verify(messageBytes, signatureBytes, pubkey.toBytes());
    if (!ok) throw new Error("Tanda tangan tidak valid");

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

    return { ok: true, walletAddress: data.walletAddress };
  });

export const getProfile = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ walletAddress: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("wallet_address", data.walletAddress)
      .maybeSingle();
    return profile;
  });

const NicknameSchema = z.object({
  walletAddress: z.string(),
  nickname: z.string().trim().min(2).max(40),
});

export const updateNickname = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => NicknameSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ nickname: data.nickname })
      .eq("wallet_address", data.walletAddress);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getNotifications = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ walletAddress: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("notifications")
      .select("*")
      .eq("wallet_address", data.walletAddress)
      .order("created_at", { ascending: false })
      .limit(30);
    return rows ?? [];
  });