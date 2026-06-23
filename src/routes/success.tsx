import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, ExternalLink, Download } from "lucide-react";
import jsPDF from "jspdf";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ClientOnly } from "@/components/brewchain/ClientOnly";
import { getOrder } from "@/lib/brewchain/orders.functions";
import { formatIDR, formatSOL, explorerTx, shortAddr } from "@/lib/brewchain/format";

export const Route = createFileRoute("/success")({
  head: () => ({ meta: [{ title: "Pembayaran Berhasil — BrewChain" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    orderId: String(s.orderId ?? ""),
    sig: typeof s.sig === "string" ? s.sig : undefined,
  }),
  component: () => <AppShell><ClientOnly><SuccessPage /></ClientOnly></AppShell>,
});

function SuccessPage() {
  const { orderId, sig } = Route.useSearch();
  const { data: order } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => getOrder({ data: { orderId } }),
    enabled: !!orderId,
  });

  const explorer = sig ? explorerTx(sig) : order?.transactions?.[0]?.explorer_url ?? null;
  const signature = sig ?? order?.transactions?.[0]?.tx_signature ?? null;

  const downloadInvoice = () => {
    if (!order) return;
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("BrewChain Invoice", 14, 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Order: ${order.order_number}`, 14, 30);
    doc.text(`Wallet: ${order.wallet_address}`, 14, 36);
    if (signature) doc.text(`Tx Sig: ${signature}`, 14, 42);
    doc.text(`Total: ${formatIDR(order.total_idr)} / ${formatSOL(Number(order.total_sol))}`, 14, 48);
    doc.text(`Status: ${order.status}`, 14, 54);
    let y = 70;
    doc.setFont("helvetica", "bold"); doc.text("Items", 14, y); y += 6;
    doc.setFont("helvetica", "normal");
    (order.order_items ?? []).forEach((i) => {
      doc.text(`${i.quantity}× ${i.product_name}`, 14, y);
      doc.text(formatIDR(i.subtotal_idr), 180, y, { align: "right" });
      y += 6;
    });
    doc.save(`${order.order_number}.pdf`);
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-16">
      <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200 }} className="mx-auto grid size-20 place-items-center rounded-full gradient-solana shadow-glow-sol">
        <CheckCircle2 className="size-10 text-white" />
      </motion.div>
      <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-6 text-center font-display text-4xl font-bold">
        Pembayaran berhasil!
      </motion.h1>
      <p className="mt-2 text-center text-muted-foreground">
        Transaksi tercatat di Solana Devnet. Berikut bukti pesananmu.
      </p>

      {order && (
        <Card className="mt-10 rounded-3xl shadow-elevated">
          <CardContent className="grid gap-6 p-6 md:grid-cols-[1fr_auto]">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Order</span><span className="font-mono font-semibold">{order.order_number}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Wallet</span><span className="font-mono">{shortAddr(order.wallet_address)}</span></div>
              {signature && <div className="flex justify-between"><span className="text-muted-foreground">Tx Sig</span><span className="font-mono">{shortAddr(signature, 6, 6)}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">Total IDR</span><span className="font-semibold">{formatIDR(order.total_idr)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total SOL</span><span className="font-semibold">{formatSOL(Number(order.total_sol))}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700">{order.status}</span></div>
            </div>
            {explorer && (
              <div className="grid place-items-center">
                <div className="rounded-2xl bg-white p-3 shadow-soft">
                  <QRCodeSVG value={explorer} size={130} />
                </div>
                <p className="mt-2 text-center text-xs text-muted-foreground">Scan untuk buka di Explorer</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {explorer && (
          <Button asChild className="rounded-full gradient-solana text-white">
            <a href={explorer} target="_blank" rel="noreferrer"><ExternalLink className="size-4" /> Solana Explorer</a>
          </Button>
        )}
        <Button onClick={downloadInvoice} variant="outline" className="rounded-full"><Download className="size-4" /> Download Invoice</Button>
        <Button asChild variant="outline" className="rounded-full"><Link to="/tracking/$orderId" params={{ orderId }}>Lacak Pesanan</Link></Button>
      </div>
    </div>
  );
}