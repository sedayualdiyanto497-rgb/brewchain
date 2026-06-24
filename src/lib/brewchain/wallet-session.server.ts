import { createHmac, timingSafeEqual } from "node:crypto";

// Lifetime: 7 days
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

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
  const payload = b64url(JSON.stringify({ w: walletAddress, iat: Date.now() }));
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

/** Returns the verified wallet address or null. Constant-time signature check. */
export function verifyWalletToken(token: string | null | undefined): string | null {
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
    const parsed = JSON.parse(b64urlDecode(payload).toString("utf8")) as { w?: string; iat?: number };
    if (!parsed.w || typeof parsed.iat !== "number") return null;
    if (Date.now() - parsed.iat > MAX_AGE_MS) return null;
    return parsed.w;
  } catch {
    return null;
  }
}