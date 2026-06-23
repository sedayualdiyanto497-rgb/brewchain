import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Circle, Clock, Coffee } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { getOrder } from "@/lib/brewchain/orders.functions";
import { formatIDR } from "@/lib/brewchain/format";

export const Route = createFileRoute("/tracking/$orderId")({
  head: () => ({ meta: [{ title: "Tracking — BrewChain" }] }),
  component: TrackingPage,
});

const STEPS = [
  { key: "pending", label: "Pending", desc: "Menunggu pembayaran" },
  { key: "paid", label: "Paid", desc: "Pembayaran diterima" },
  { key: "preparing", label: "Preparing", desc: "Barista meracik" },
  { key: "ready", label: "Ready", desc: "Siap diambil" },
  { key: "completed", label: "Completed", desc: "Selesai" },
] as const;

function TrackingPage() {
  const { orderId } = useParams({ from: "/tracking/$orderId" });
  const { data: order } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => getOrder({ data: { orderId } }),
    refetchInterval: 5000,
  });
  if (!order) return <AppShell><div className="container mx-auto px-4 py-20">Memuat…</div></AppShell>;
  const currentIdx = STEPS.findIndex((s) => s.key === order.status);

  return (
    <AppShell>
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-display text-3xl font-bold">Lacak Pesanan</h1>
        <p className="mt-1 font-mono text-sm text-muted-foreground">{order.order_number}</p>

        <Card className="mt-8 rounded-3xl shadow-soft">
          <CardContent className="p-6">
            <ol className="relative grid gap-6 md:grid-cols-5">
              {STEPS.map((step, i) => {
                const done = i < currentIdx;
                const active = i === currentIdx;
                return (
                  <li key={step.key} className="flex flex-col items-center text-center">
                    <div className={`grid size-10 place-items-center rounded-full transition ${
                      done ? "gradient-coffee text-cream" :
                      active ? "gradient-solana text-white shadow-glow-sol animate-pulse" :
                      "bg-secondary text-muted-foreground"
                    }`}>
                      {done ? <CheckCircle2 className="size-5" /> : active ? <Clock className="size-5" /> : <Circle className="size-5" />}
                    </div>
                    <div className="mt-2 text-sm font-semibold">{step.label}</div>
                    <div className="text-xs text-muted-foreground">{step.desc}</div>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>

        <Card className="mt-6 rounded-3xl">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold">Items</h2>
            <ul className="mt-3 divide-y">
              {(order.order_items ?? []).map((i) => (
                <li key={i.id} className="flex items-center justify-between py-3">
                  <span className="flex items-center gap-2"><Coffee className="size-4 text-muted-foreground" /> {i.quantity}× {i.product_name}</span>
                  <span className="font-semibold">{formatIDR(i.subtotal_idr)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-between border-t pt-4">
              <span className="font-semibold">Total</span>
              <span className="font-display text-xl font-bold">{formatIDR(order.total_idr)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}