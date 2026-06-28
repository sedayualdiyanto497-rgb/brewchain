import { createHmac, timingSafeEqual } from "node:crypto";

// Lifetime: 7 days. Warning surfaced to UI when within 1 hour of expiry.
export const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export const SESSION_WARN_WINDOW_MS = 60 * 60 * 1000;

function getSecret(): string {
  const s = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!s) throw new Error("Missing server secret for wallet session signing");
  return s;
}

function b64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf.toString("base64").replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function b64urlDecode(input: string): Buffer {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function sign(payload: string): string {
  return b64url(createHmac("sha256", getSecret()).update(payload).digest());
}

/** Mint a signed wallet session token. */
export function mintWalletToken(walletAddress: string): string {
  const iat = Date.now();
  const payload = b64url(JSON.stringify({ w: walletAddress, iat, exp: iat + SESSION_MAX_AGE_MS }));
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

export type VerifiedSession = { wallet: string; issuedAt: number; expiresAt: number };

/** Returns the verified wallet address or null. Constant-time signature check. */
export function verifyWalletToken(token: string | null | undefined): string | null {
  const s = verifyWalletSession(token);
  return s?.wallet ?? null;
}

/** Returns full verified session (wallet + timestamps) or null. */
export function verifyWalletSession(token: string | null | undefined): VerifiedSession | null {
  if (!token || typeof token !== "string") return null;
  const idx = token.indexOf(".");
  if (idx <= 0 || idx === token.length - 1) return null;
  const payload = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(b64urlDecode(payload).toString("utf8")) as { w?: string; iat?: number; exp?: number };
    if (!parsed.w || typeof parsed.iat !== "number") return null;
    const exp = typeof parsed.exp === "number" ? parsed.exp : parsed.iat + SESSION_MAX_AGE_MS;
    if (Date.now() > exp) return null;
    return { wallet: parsed.w, issuedAt: parsed.iat, expiresAt: exp };
  } catch {
    return null;
  }
}