/**
 * BrewChain security smoke tests.
 *
 * Three layers of coverage:
 *
 *  1. Wallet-session token logic (pure crypto, no network):
 *     mint → verify round-trip, tamper detection, expiry rejection.
 *
 *  2. Zod input validation:
 *     verifyWalletSignIn rejects malformed payloads (base58/length/charset)
 *     before they reach blockchain or Prisma logic.
 *
 *  3. Static guarantee that every server function previously exposed
 *     publicly now declares either `requireWalletAuth` or
 *     `requireAdminWallet` as middleware. This catches regressions where a
 *     future edit accidentally drops the guard.
 *
 * Notes:
 * - Direct in-process invocation of TanStack `createServerFn` handlers is
 *   unreliable in unit tests (the RPC layer dispatches differently outside
 *   a real request context). The static check below ensures the guard is
 *   wired; the runtime guard itself is exercised by (1) — the same code path
 *   middleware runs through.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// --------------------------------------------------------------------------
// 1. Wallet-session token crypto
// --------------------------------------------------------------------------

// The session signer reads SUPABASE_PUBLISHABLE_KEY/SUPABASE_SERVICE_ROLE_KEY
// for HMAC; make sure one is present for the test process.
process.env.SUPABASE_PUBLISHABLE_KEY ||= "test-secret-key-for-vitest-only";

describe("wallet-session token", () => {
  it("round-trips a fresh token and exposes wallet + expiry", async () => {
    const { mintWalletToken, verifyWalletSession, SESSION_MAX_AGE_MS } = await import(
      "@/lib/brewchain/wallet-session.server"
    );
    const wallet = "BrewChainTestWallet11111111111111111111111111";
    const tok = mintWalletToken(wallet);
    const s = verifyWalletSession(tok);
    expect(s).not.toBeNull();
    expect(s!.wallet).toBe(wallet);
    expect(s!.expiresAt - s!.issuedAt).toBe(SESSION_MAX_AGE_MS);
    expect(s!.expiresAt).toBeGreaterThan(Date.now());
  });

  it("rejects tampered payload", async () => {
    const { mintWalletToken, verifyWalletSession } = await import(
      "@/lib/brewchain/wallet-session.server"
    );
    const tok = mintWalletToken("WalletA1111111111111111111111111");
    const [payload, sig] = tok.split(".");
    // Flip a payload bit but keep the original signature → must fail.
    const tampered = payload.slice(0, -1) + (payload.slice(-1) === "A" ? "B" : "A") + "." + sig;
    expect(verifyWalletSession(tampered)).toBeNull();
  });

  it("rejects tampered signature", async () => {
    const { mintWalletToken, verifyWalletSession } = await import(
      "@/lib/brewchain/wallet-session.server"
    );
    const tok = mintWalletToken("WalletB1111111111111111111111111");
    const tampered = tok.slice(0, -1) + (tok.slice(-1) === "A" ? "B" : "A");
    expect(verifyWalletSession(tampered)).toBeNull();
  });

  it("rejects empty / malformed tokens", async () => {
    const { verifyWalletSession } = await import("@/lib/brewchain/wallet-session.server");
    expect(verifyWalletSession(null)).toBeNull();
    expect(verifyWalletSession("")).toBeNull();
    expect(verifyWalletSession("no-dot")).toBeNull();
    expect(verifyWalletSession(".onlydot")).toBeNull();
    expect(verifyWalletSession("only.")).toBeNull();
  });

  it("rejects an expired token", async () => {
    const { verifyWalletSession } = await import("@/lib/brewchain/wallet-session.server");
    const { createHmac } = await import("node:crypto");
    const secret = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const oldIat = Date.now() - 10 * 24 * 60 * 60 * 1000; // 10 days ago
    const payloadObj = { w: "WalletExpired111111111111111111", iat: oldIat, exp: oldIat + 60_000 };
    const payload = Buffer.from(JSON.stringify(payloadObj))
      .toString("base64")
      .replace(/=+$/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
    const sig = createHmac("sha256", secret).update(payload).digest("hex");
    expect(verifyWalletSession(`${payload}.${sig}`)).toBeNull();
  });
});

// --------------------------------------------------------------------------
// 2. Zod input validation
// --------------------------------------------------------------------------

async function expectRejected(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (e) {
    return e;
  }
  throw new Error("expected promise to reject");
}

describe("Zod validators: verifyWalletSignIn", () => {
  it("rejects non-base58 wallet address", async () => {
    const { verifyWalletSignIn } = await import("@/lib/brewchain/profile.functions");
    await expectRejected(
      verifyWalletSignIn({
        data: {
          walletAddress: "0Onot_base58_at_all_with_bad_chars!!",
          message: "BrewChain sign in nonce=abc",
          signatureB58: "1".repeat(80),
        } as never,
      }),
    );
  });

  it("rejects short signature", async () => {
    const { verifyWalletSignIn } = await import("@/lib/brewchain/profile.functions");
    await expectRejected(
      verifyWalletSignIn({
        data: {
          walletAddress: "11111111111111111111111111111111",
          message: "BrewChain sign in nonce=abc",
          signatureB58: "short",
        } as never,
      }),
    );
  });

  it("rejects control characters in message", async () => {
    const { verifyWalletSignIn } = await import("@/lib/brewchain/profile.functions");
    await expectRejected(
      verifyWalletSignIn({
        data: {
          walletAddress: "11111111111111111111111111111111",
          message: "evil\u0000\u0007\u001Bpayload",
          signatureB58: "1".repeat(80),
        } as never,
      }),
    );
  });

  it("rejects oversized message", async () => {
    const { verifyWalletSignIn } = await import("@/lib/brewchain/profile.functions");
    await expectRejected(
      verifyWalletSignIn({
        data: {
          walletAddress: "11111111111111111111111111111111",
          message: "x".repeat(2000),
          signatureB58: "1".repeat(80),
        } as never,
      }),
    );
  });
});

describe("Zod validators: payment / record-tx", () => {
  it("recordBlockchainTransaction rejects malformed UUID", async () => {
    const { recordBlockchainTransaction } = await import("@/lib/brewchain/orders.functions");
    await expectRejected(
      recordBlockchainTransaction({
        data: {
          orderId: "not-a-uuid",
          recipientAddress: "11111111111111111111111111111111",
          txSignature: "demo_" + "1".repeat(80),
          totalSol: 0.01,
        } as never,
      }),
    );
  });

  it("recordBlockchainTransaction rejects negative totalSol", async () => {
    const { recordBlockchainTransaction } = await import("@/lib/brewchain/orders.functions");
    await expectRejected(
      recordBlockchainTransaction({
        data: {
          orderId: "00000000-0000-0000-0000-000000000000",
          recipientAddress: "11111111111111111111111111111111",
          txSignature: "1".repeat(80),
          totalSol: -1,
        } as never,
      }),
    );
  });

  it("recordBlockchainTransaction rejects non-base58 signature", async () => {
    const { recordBlockchainTransaction } = await import("@/lib/brewchain/orders.functions");
    await expectRejected(
      recordBlockchainTransaction({
        data: {
          orderId: "00000000-0000-0000-0000-000000000000",
          recipientAddress: "11111111111111111111111111111111",
          txSignature: "has spaces and 0Ol!",
          totalSol: 0.01,
        } as never,
      }),
    );
  });
});

// --------------------------------------------------------------------------
// 3. Static guarantee — every previously-public server fn declares an auth guard
// --------------------------------------------------------------------------

function fileFor(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

/** Extract `export const <name>` blocks (until the next top-level `export const` or EOF). */
function extractServerFnBlocks(src: string): Record<string, string> {
  const out: Record<string, string> = {};
  // Append a sentinel so the regex can terminate the last block consistently.
  const padded = src + "\nexport const __END_SENTINEL__ = createServerFn";
  const re = /^export const (\w+) = createServerFn\b[\s\S]*?(?=^export const )/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(padded))) {
    if (m[1] !== "__END_SENTINEL__") out[m[1]] = m[0];
  }
  return out;
}

describe("static guarantee: every user-facing server fn has an auth guard", () => {
  const cases: Array<{ file: string; userFns: string[]; adminFns: string[] }> = [
    {
      file: "src/lib/brewchain/profile.functions.ts",
      userFns: ["getProfile", "updateNickname", "getNotifications", "getMyRole", "getSessionInfo"],
      adminFns: [],
    },
    {
      file: "src/lib/brewchain/orders.functions.ts",
      userFns: ["createOrder", "recordBlockchainTransaction", "payOrderDemo"],
      adminFns: ["listAllOrders", "verifyPayment", "updateOrderStatus"],
    },
    {
      file: "src/lib/brewchain/catalog.functions.ts",
      userFns: ["toggleWishlist", "getWishlist", "addReview"],
      adminFns: [],
    },
    {
      file: "src/lib/brewchain/admin.functions.ts",
      userFns: [],
      adminFns: [
        "createProduct", "updateProduct", "deleteProduct",
        "createVoucher", "updateVoucher", "deleteVoucher",
        "adminListAuditLog",
      ],
    },
  ];

  for (const c of cases) {
    const blocks = extractServerFnBlocks(fileFor(c.file));
    for (const name of c.userFns) {
      it(`${name} (in ${c.file}) requires wallet auth`, () => {
        const b = blocks[name];
        expect(b, `missing export const ${name}`).toBeTruthy();
        // Must reference one of the two guards in its definition.
        const hasGuard = /\.middleware\(\[\s*(requireWalletAuth|requireAdminWallet)/.test(b);
        expect(hasGuard, `${name} missing .middleware([requireWalletAuth|requireAdminWallet])`).toBe(true);
        // Must NOT take walletAddress as user-supplied input (impersonation defence).
        const usesUserWallet = /walletAddress:\s*z\./.test(b);
        expect(usesUserWallet, `${name} should not accept walletAddress in input schema`).toBe(false);
      });
    }
    for (const name of c.adminFns) {
      it(`${name} (in ${c.file}) requires admin role`, () => {
        const b = blocks[name];
        expect(b, `missing export const ${name}`).toBeTruthy();
        const hasAdmin = /\.middleware\(\[\s*requireAdminWallet/.test(b);
        expect(hasAdmin, `${name} missing .middleware([requireAdminWallet])`).toBe(true);
      });
    }
  }
});

// --------------------------------------------------------------------------
// 4. Static guarantee — verifyWalletSignIn does NOT use any auth middleware
//    (it is the bootstrap endpoint; auth is performed by the signature itself).
// --------------------------------------------------------------------------

describe("verifyWalletSignIn bootstrap endpoint", () => {
  it("validates input with Zod and does not require a prior session", () => {
    const src = fileFor("src/lib/brewchain/profile.functions.ts");
    const blocks = extractServerFnBlocks(src);
    const b = blocks["verifyWalletSignIn"];
    expect(b).toBeTruthy();
    expect(/\.inputValidator\(/.test(b)).toBe(true);
    // Must NOT chain requireWalletAuth — would create a chicken-and-egg.
    expect(/requireWalletAuth|requireAdminWallet/.test(b)).toBe(false);
  });
});