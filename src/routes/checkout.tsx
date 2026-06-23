import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Wallet, Sparkles, ShieldCheck, CheckCircle2, Circle, ExternalLink } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ClientOnly } from "@/components/brewchain/ClientOnly";
import { useCart, cart } from "@/lib/brewchain/cart-store";
import { useWalletAuth } from "@/contexts/WalletAuthProvider";
import { formatIDR, formatSOL, shortAddr } from "@/lib/brewchain/format";
import { MERCHANT_WALLET } from "@/lib/solana/config";
import { createOrder, payOrderDemo } from "@/lib/brewchain/orders.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout — BrewChain" }] }),
  validateSearch: (s: Record<string, unknown>) => ({ voucher: typeof s.voucher === "string" ? s.voucher : undefined }),
  component: () => <AppShell><ClientOnly><CheckoutPage /></ClientOnly></AppShell>,
});

type PayStage = "creating" | "signing" | "broadcasting" | "confirming" | "recording" | "done" | "error";

const STAGES: Array<{ key: PayStage; label: string; desc: string }> = [
  { key: "creating",     label: "Membuat pesanan",         desc: "Mengunci harga & stok di server" },
  { key: "signing",      label: "Tanda tangan demo wallet",desc: "Simulasi persetujuan transaksi" },
  { key: "broadcasting", label: "Mengirim ke Devnet",      desc: "Broadcast transaksi simulasi" },
  { key: "confirming",   label: "Menunggu konfirmasi",     desc: "Menunggu finalisasi on-chain" },
  { key: "recording",    label: "Mencatat ke database",    desc: "Menyimpan signature & memperbarui pesanan" },
];

function CheckoutPage() {
  const items = useCart();
  const { voucher } = Route.useSearch();
  const { session, isAuthenticated } = useWalletAuth();
  const navigate = useNavigate();
  const [paying, setPaying] = useState(false);
  const [stage, setStage] = useState<PayStage | null>(null);
  const [stageError, setStageError] = useState<string | null>(null);
  const [liveSig, setLiveSig] = useState<string | null>(null);

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
    setStageError(null);
    setLiveSig(null);
    try {
      setStage("creating");
      const order = await createOrder({
        data: {
          walletAddress: session.walletAddress,
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          voucherCode: voucher ?? null,
          paymentMethod: "solana",
        },
      });

      // Demo wallet flow — fully simulated (no real SOL needed)
      setStage("signing");
      await new Promise((r) => setTimeout(r, 700));
      setStage("broadcasting");
      await new Promise((r) => setTimeout(r, 500));
      setStage("confirming");
      const res = await payOrderDemo({
        data: { orderId: order.id, walletAddress: session.walletAddress },
      });
      setLiveSig(res.signature);
      setStage("recording");
      await new Promise((r) => setTimeout(r, 400));
      setStage("done");
      cart.clear();
      await new Promise((r) => setTimeout(r, 600));
      navigate({ to: "/success", search: { orderId: order.id, sig: res.signature } as never });
    } catch (e) {
      console.error(e);
      setStage("error");
      setStageError((e as Error)?.message ?? "Pembayaran gagal");
      toast.error("Pembayaran gagal", { description: (e as Error)?.message });
    } finally {
      setPaying(false);
    }
  };

  if (items.length === 0) {
    return <div className="container mx-auto px-4 py-20 text-center">Cart kosong.</div>;
  }

  return (
    <>
    <div className="container mx-auto grid gap-8 px-4 py-12 md:grid-cols-[1fr_400px]">
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-bold">Checkout</h1>

        <Card className="rounded-2xl shadow-soft">
          <CardContent className="p-6">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Wallet Tujuan (Merchant)</div>
            <div className="mt-1 font-mono text-sm">{merchantAddr}</div>
            <div className="mt-1 text-xs text-muted-foreground">Solana · Devnet (Demo Mode)</div>
          </CardContent>
        </Card>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Metode Pembayaran</h2>
          <div className="mt-3 rounded-2xl border border-primary bg-primary/5 p-4 shadow-soft">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl gradient-solana text-white shadow-glow-sol">
                <Sparkles className="size-5" />
              </div>
              <div>
                <div className="font-semibold">Demo Wallet Solana</div>
                <div className="text-xs text-muted-foreground">
                  Simulasi pembayaran Devnet — tidak memerlukan SOL asli. Cocok untuk pengujian & demo skripsi.
                </div>
              </div>
            </div>
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
            {paying ? <><Loader2 className="size-4 animate-spin" /> Memproses…</> : <><Wallet className="size-4" /> Bayar {formatSOL(totalSol)} (Demo)</>}
          </Button>
        </CardContent>
      </Card>
    </div>

    <PaymentProgressOverlay
      open={stage !== null && stage !== "done"}
      stage={stage}
      error={stageError}
      signature={liveSig}
      onClose={() => {
        if (stage === "error") {
          setStage(null);
          setStageError(null);
        }
      }}
    />
    </>
  );
}

function PaymentProgressOverlay({
  open,
  stage,
  error,
  signature,
  onClose,
}: {
  open: boolean;
  stage: PayStage | null;
  error: string | null;
  signature: string | null;
  onClose: () => void;
}) {
  const currentIdx = stage ? STAGES.findIndex((s) => s.key === stage) : -1;
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 grid place-items-center bg-coffee-950/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ y: 16, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 16, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            className="w-[min(92vw,460px)] rounded-3xl bg-card p-6 shadow-2xl"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-full gradient-solana text-white shadow-glow-sol">
                <Wallet className="size-5" />
              </div>
              <div>
                <div className="font-display text-lg font-bold">Memproses Pembayaran</div>
                <div className="text-xs text-muted-foreground">Solana · Devnet</div>
              </div>
            </div>

            <ol className="space-y-3">
              {STAGES.map((s, i) => {
                const done = currentIdx > i || (stage === "done" && i < STAGES.length);
                const active = currentIdx === i && stage !== "error";
                const isErrorHere = stage === "error" && currentIdx === i;
                return (
                  <li key={s.key} className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full transition ${
                        done
                          ? "bg-emerald-500 text-white"
                          : active
                            ? "gradient-solana text-white shadow-glow-sol"
                            : isErrorHere
                              ? "bg-destructive text-destructive-foreground"
                              : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {done ? (
                        <CheckCircle2 className="size-4" />
                      ) : active ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Circle className="size-3.5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className={`text-sm font-semibold ${active ? "text-foreground" : done ? "text-foreground" : "text-muted-foreground"}`}>
                        {s.label}
                      </div>
                      <div className="text-xs text-muted-foreground">{s.desc}</div>
                    </div>
                  </li>
                );
              })}
            </ol>

            {signature && (
              <a
                href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`}
                target="_blank"
                rel="noreferrer"
                className="mt-5 flex items-center justify-between rounded-xl bg-secondary/50 p-3 text-xs font-mono hover:bg-secondary"
              >
                <span className="truncate">{signature.slice(0, 14)}…{signature.slice(-10)}</span>
                <ExternalLink className="size-3.5 opacity-70" />
              </a>
            )}

            {error && (
              <div className="mt-5 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                {error}
                <Button onClick={onClose} variant="outline" size="sm" className="mt-3 w-full">
                  Tutup & Coba Lagi
                </Button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
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