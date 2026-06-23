import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, SystemProgram, Transaction, PublicKey } from "@solana/web3.js";
import { motion } from "framer-motion";
import { Loader2, Wallet, QrCode, Building2, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ClientOnly } from "@/components/brewchain/ClientOnly";
import { useCart, cart } from "@/lib/brewchain/cart-store";
import { useWalletAuth } from "@/contexts/WalletAuthProvider";
import { formatIDR, formatSOL, shortAddr } from "@/lib/brewchain/format";
import { MERCHANT_WALLET } from "@/lib/solana/config";
import { createOrder, recordBlockchainTransaction } from "@/lib/brewchain/orders.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout — BrewChain" }] }),
  validateSearch: (s: Record<string, unknown>) => ({ voucher: typeof s.voucher === "string" ? s.voucher : undefined }),
  component: () => <AppShell><ClientOnly><CheckoutPage /></ClientOnly></AppShell>,
});

type Method = "solana" | "qris" | "bank_transfer";

function CheckoutPage() {
  const items = useCart();
  const { voucher } = Route.useSearch();
  const { session, isAuthenticated } = useWalletAuth();
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const navigate = useNavigate();
  const [method, setMethod] = useState<Method>("solana");
  const [paying, setPaying] = useState(false);

  const subtotal = items.reduce((s, i) => s + i.priceIdr * i.quantity, 0);
  const totalSol = items.reduce((s, i) => s + i.priceSol * i.quantity, 0);
  const discount = voucher === "BREW10" && subtotal >= 30000 ? Math.round(subtotal * 0.1)
    : voucher === "SOLANA20" && subtotal >= 50000 ? Math.round(subtotal * 0.2)
    : 0;
  const tax = Math.round((subtotal - discount) * 0.1);
  const total = subtotal - discount + tax;

  const merchantAddr = useMemo(() => MERCHANT_WALLET.toBase58(), []);

  const handlePay = async () => {
    if (!isAuthenticated || !session) return toast.error("Login wallet terlebih dahulu");
    if (items.length === 0) return toast.error("Cart kosong");
    setPaying(true);
    try {
      // 1) create order on server (computes prices server-side, locks voucher)
      const order = await createOrder({
        data: {
          walletAddress: session.walletAddress,
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          voucherCode: voucher ?? null,
          paymentMethod: method,
        },
      });

      // 2) For solana method, send on-chain transaction
      if (method === "solana") {
        if (!publicKey || !sendTransaction) throw new Error("Wallet tidak siap");
        const lamports = Math.round(Number(order.total_sol) * LAMPORTS_PER_SOL);
        const tx = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: new PublicKey(merchantAddr),
            lamports,
          }),
        );
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;
        tx.feePayer = publicKey;

        const signature = await sendTransaction(tx, connection);
        toast("Menunggu konfirmasi blockchain…");
        await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");

        await recordBlockchainTransaction({
          data: {
            orderId: order.id,
            walletAddress: session.walletAddress,
            recipientAddress: merchantAddr,
            txSignature: signature,
            totalSol: Number(order.total_sol),
            blockTime: Math.floor(Date.now() / 1000),
          },
        });

        cart.clear();
        navigate({ to: "/success", search: { orderId: order.id, sig: signature } as never });
        return;
      }

      // QRIS / bank — verifikasi manual oleh kasir
      cart.clear();
      navigate({ to: "/tracking/$orderId", params: { orderId: order.id } });
    } catch (e) {
      console.error(e);
      toast.error("Pembayaran gagal", { description: (e as Error)?.message });
    } finally {
      setPaying(false);
    }
  };

  if (items.length === 0) {
    return <div className="container mx-auto px-4 py-20 text-center">Cart kosong.</div>;
  }

  return (
    <div className="container mx-auto grid gap-8 px-4 py-12 md:grid-cols-[1fr_400px]">
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-bold">Checkout</h1>

        <Card className="rounded-2xl shadow-soft">
          <CardContent className="p-6">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Wallet Tujuan (Merchant)</div>
            <div className="mt-1 font-mono text-sm">{merchantAddr}</div>
            <div className="mt-1 text-xs text-muted-foreground">Solana · Devnet</div>
          </CardContent>
        </Card>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Metode Pembayaran</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {([
              { id: "solana" as Method, icon: Wallet, label: "Solana", desc: "Bayar SOL on-chain" },
              { id: "qris" as Method, icon: QrCode, label: "QRIS", desc: "Verifikasi kasir" },
              { id: "bank_transfer" as Method, icon: Building2, label: "Bank Transfer", desc: "Verifikasi kasir" },
            ]).map((m) => (
              <motion.button
                key={m.id} type="button" whileHover={{ y: -2 }}
                onClick={() => setMethod(m.id)}
                className={`rounded-2xl border p-4 text-left transition ${method === m.id ? "border-primary bg-primary/5 shadow-soft" : "border-border bg-card"}`}
              >
                <m.icon className="size-5" />
                <div className="mt-2 font-semibold">{m.label}</div>
                <div className="text-xs text-muted-foreground">{m.desc}</div>
              </motion.button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Ringkasan Pesanan</h2>
          <Card className="mt-3 rounded-2xl">
            <CardContent className="divide-y p-0">
              {items.map((i) => (
                <div key={i.productId} className="flex items-center justify-between gap-4 p-4">
                  <div className="flex items-center gap-3">
                    <div className="size-12 overflow-hidden rounded-xl bg-muted">
                      {i.imageUrl && <img src={i.imageUrl} alt={i.name} className="size-full object-cover" />}
                    </div>
                    <div>
                      <div className="font-semibold">{i.name}</div>
                      <div className="text-xs text-muted-foreground">{i.quantity} × {formatIDR(i.priceIdr)}</div>
                    </div>
                  </div>
                  <div className="font-semibold">{formatIDR(i.priceIdr * i.quantity)}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="h-fit rounded-2xl shadow-soft md:sticky md:top-24">
        <CardContent className="p-6">
          <h2 className="font-display text-xl font-bold">Total Pembayaran</h2>
          <div className="mt-4 space-y-2 text-sm">
            <Row label="Subtotal" value={formatIDR(subtotal)} />
            {discount > 0 && <Row label={`Voucher ${voucher}`} value={`- ${formatIDR(discount)}`} />}
            <Row label="Pajak" value={formatIDR(tax)} />
            <div className="my-3 border-t" />
            <Row label="Total IDR" value={formatIDR(total)} bold />
            <Row label="Total SOL" value={formatSOL(totalSol)} muted />
          </div>

          <div className="mt-5 rounded-xl bg-secondary/40 p-3 text-xs text-muted-foreground">
            <ShieldCheck className="mr-1 inline size-3.5" /> Login wallet: {isAuthenticated ? <span className="font-mono">{shortAddr(session?.walletAddress)}</span> : "belum login"}
          </div>

          <Button className="mt-6 w-full rounded-full gradient-solana text-white shadow-glow-sol" size="lg" disabled={paying || !isAuthenticated} onClick={handlePay}>
            {paying ? <><Loader2 className="size-4 animate-spin" /> Memproses…</> : `Bayar ${method === "solana" ? formatSOL(totalSol) : formatIDR(total)}`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value, bold, muted }: { label: string; value: string; bold?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-muted-foreground" : ""}>{label}</span>
      <span className={`${bold ? "font-display text-xl font-bold" : ""} ${muted ? "text-muted-foreground" : ""}`}>{value}</span>
    </div>
  );
}