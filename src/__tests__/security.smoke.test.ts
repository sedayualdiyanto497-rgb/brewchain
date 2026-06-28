/**
 * Security smoke tests.
 *
 * Verifies that every server function previously exposed publicly now refuses
 * unauthenticated calls. We exercise the real handlers (not HTTP) by calling
 * the server-fn objects directly with no wallet token in the request context.
 *
 * Expected behaviour:
 *   - requireWalletAuth → throws Response 401 (WALLET_SESSION_INVALID)
 *   - requireAdminWallet → throws Response 401 (no token) or 403 (token but no role)
 *   - Zod validators → reject malformed payloads with ZodError (HTTP 400 in prod)
 */
import { describe, it, expect } from "vitest";

// --- helpers --------------------------------------------------------------

async function expectStatus(promise: Promise<unknown>, statuses: number[]): Promise<void> {
  try {
    await promise;
  } catch (err) {
    if (err instanceof Response) {
      expect(statuses).toContain(err.status);
      return;
    }
    // ZodError or generic Error counts as a rejection for malformed-payload tests.
    if (statuses.includes(400) && err instanceof Error) return;
    throw err;
  }
  throw new Error(`Expected call to throw one of statuses ${statuses.join(",")}, but it resolved.`);
}

// --- tests ----------------------------------------------------------------

describe("wallet-session auth guards (no token)", () => {
  it("getProfile → 401", async () => {
    const { getProfile } = await import("@/lib/brewchain/profile.functions");
    await expectStatus(getProfile(), [401]);
  });

  it("getNotifications → 401", async () => {
    const { getNotifications } = await import("@/lib/brewchain/profile.functions");
    await expectStatus(getNotifications(), [401]);
  });

  it("getMyRole → 401", async () => {
    const { getMyRole } = await import("@/lib/brewchain/profile.functions");
    await expectStatus(getMyRole(), [401]);
  });

  it("getSessionInfo → 401", async () => {
    const { getSessionInfo } = await import("@/lib/brewchain/profile.functions");
    await expectStatus(getSessionInfo(), [401]);
  });

  it("updateNickname → 401", async () => {
    const { updateNickname } = await import("@/lib/brewchain/profile.functions");
    await expectStatus(updateNickname({ data: { nickname: "x" } }), [401]);
  });

  it("createOrder → 401", async () => {
    const { createOrder } = await import("@/lib/brewchain/orders.functions");
    await expectStatus(
      createOrder({ data: { items: [], pickupType: "pickup", paymentMethod: "demo" } as never }),
      [401, 400],
    );
  });

  it("recordBlockchainTransaction → 401", async () => {
    const { recordBlockchainTransaction } = await import("@/lib/brewchain/orders.functions");
    await expectStatus(
      recordBlockchainTransaction({
        data: {
          orderId: "00000000-0000-0000-0000-000000000000",
          recipientAddress: "11111111111111111111111111111111",
          txSignature: "demo_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          totalSol: 0.01,
        },
      }),
      [401],
    );
  });

  it("toggleWishlist → 401", async () => {
    const { toggleWishlist } = await import("@/lib/brewchain/catalog.functions");
    await expectStatus(
      toggleWishlist({ data: { productId: "00000000-0000-0000-0000-000000000000" } }),
      [401],
    );
  });

  it("getWishlist → 401", async () => {
    const { getWishlist } = await import("@/lib/brewchain/catalog.functions");
    await expectStatus(getWishlist(), [401]);
  });

  it("addReview → 401", async () => {
    const { addReview } = await import("@/lib/brewchain/catalog.functions");
    await expectStatus(
      addReview({
        data: {
          productId: "00000000-0000-0000-0000-000000000000",
          rating: 5,
          comment: "ok",
        },
      }),
      [401],
    );
  });
});

describe("admin role guards (no token)", () => {
  it("listAllOrders → 401/403", async () => {
    const { listAllOrders } = await import("@/lib/brewchain/orders.functions");
    await expectStatus(listAllOrders(), [401, 403]);
  });

  it("verifyPayment → 401/403", async () => {
    const { verifyPayment } = await import("@/lib/brewchain/orders.functions");
    await expectStatus(
      verifyPayment({ data: { orderId: "00000000-0000-0000-0000-000000000000" } }),
      [401, 403],
    );
  });

  it("updateOrderStatus → 401/403", async () => {
    const { updateOrderStatus } = await import("@/lib/brewchain/orders.functions");
    await expectStatus(
      updateOrderStatus({
        data: { orderId: "00000000-0000-0000-0000-000000000000", status: "preparing" },
      }),
      [401, 403],
    );
  });

  it("createProduct → 401/403", async () => {
    const { createProduct } = await import("@/lib/brewchain/admin.functions");
    await expectStatus(
      createProduct({
        data: {
          name: "Test", slug: "test", description: "x", price_sol: 0.01, price_idr: 1000,
          category: "coffee", is_active: true,
        } as never,
      }),
      [401, 403, 400],
    );
  });

  it("deleteVoucher → 401/403", async () => {
    const { deleteVoucher } = await import("@/lib/brewchain/admin.functions");
    await expectStatus(
      deleteVoucher({ data: { id: "00000000-0000-0000-0000-000000000000" } }),
      [401, 403],
    );
  });

  it("adminListAuditLog → 401/403", async () => {
    const { adminListAuditLog } = await import("@/lib/brewchain/admin.functions");
    await expectStatus(adminListAuditLog(), [401, 403]);
  });
});

describe("Zod input validation (verifyWalletSignIn)", () => {
  it("rejects non-base58 wallet address", async () => {
    const { verifyWalletSignIn } = await import("@/lib/brewchain/profile.functions");
    await expectStatus(
      verifyWalletSignIn({
        data: {
          walletAddress: "0x0000not_base58_at_all_0OIl",
          message: "BrewChain sign in nonce=abc",
          signatureB58: "1".repeat(80),
        } as never,
      }),
      [400],
    );
  });

  it("rejects empty signature", async () => {
    const { verifyWalletSignIn } = await import("@/lib/brewchain/profile.functions");
    await expectStatus(
      verifyWalletSignIn({
        data: {
          walletAddress: "11111111111111111111111111111111",
          message: "BrewChain sign in nonce=abc",
          signatureB58: "",
        } as never,
      }),
      [400],
    );
  });

  it("rejects message with control characters", async () => {
    const { verifyWalletSignIn } = await import("@/lib/brewchain/profile.functions");
    await expectStatus(
      verifyWalletSignIn({
        data: {
          walletAddress: "11111111111111111111111111111111",
          message: "evil\u0000message\u0007with\u001Bctrl",
          signatureB58: "1".repeat(80),
        } as never,
      }),
      [400],
    );
  });
});

describe("Zod input validation (payment / record-tx)", () => {
  it("rejects bad UUID order id", async () => {
    const { recordBlockchainTransaction } = await import("@/lib/brewchain/orders.functions");
    await expectStatus(
      recordBlockchainTransaction({
        data: {
          orderId: "not-a-uuid",
          recipientAddress: "11111111111111111111111111111111",
          txSignature: "demo_" + "1".repeat(80),
          totalSol: 0.01,
        } as never,
      }),
      [400],
    );
  });

  it("rejects negative totalSol", async () => {
    const { recordBlockchainTransaction } = await import("@/lib/brewchain/orders.functions");
    await expectStatus(
      recordBlockchainTransaction({
        data: {
          orderId: "00000000-0000-0000-0000-000000000000",
          recipientAddress: "11111111111111111111111111111111",
          txSignature: "1".repeat(80),
          totalSol: -1,
        } as never,
      }),
      [400],
    );
  });

  it("verifyPayment rejects bad UUID", async () => {
    const { verifyPayment } = await import("@/lib/brewchain/orders.functions");
    await expectStatus(verifyPayment({ data: { orderId: "nope" } as never }), [400, 401, 403]);
  });
});