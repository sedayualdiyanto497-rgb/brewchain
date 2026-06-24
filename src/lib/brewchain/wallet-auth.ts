import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

export const WALLET_TOKEN_STORAGE = "brewchain.token";
const HEADER = "x-wallet-token";

/**
 * Client-side function middleware: reads the wallet session token from
 * localStorage and forwards it to the server via a custom header.
 * Registered globally in `src/start.ts`.
 */
export const attachWalletToken = createMiddleware({ type: "function" }).client(async ({ next }) => {
  let token: string | null = null;
  if (typeof window !== "undefined") {
    try {
      token = window.localStorage.getItem(WALLET_TOKEN_STORAGE);
    } catch {
      token = null;
    }
  }
  return next({ headers: token ? { [HEADER]: token } : {} });
});

/**
 * Server-side function middleware: verifies the wallet session token from the
 * request header and exposes `context.walletAddress`.
 * Throws 401 when missing or invalid.
 */
export const requireWalletAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const req = getRequest();
  const token = req?.headers?.get(HEADER) ?? null;
  const { verifyWalletToken } = await import("./wallet-session.server");
  const wallet = verifyWalletToken(token);
  if (!wallet) {
    throw new Response("Unauthorized: wallet session invalid", { status: 401 });
  }
  return next({ context: { walletAddress: wallet } });
});

/**
 * Server-side function middleware: requires the caller to be an admin or
 * staff member in the app_roles table.
 */
export const requireAdminWallet = createMiddleware({ type: "function" })
  .middleware([requireWalletAuth])
  .server(async ({ next, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("app_roles")
      .select("role")
      .eq("wallet_address", context.walletAddress)
      .in("role", ["admin", "staff"]);
    if (!data || data.length === 0) {
      throw new Response("Forbidden: admin role required", { status: 403 });
    }
    return next({ context: { walletAddress: context.walletAddress, role: data[0].role } });
  });