import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { requireAdminWallet } from "@/lib/brewchain/wallet-auth";
import { CheckCircle2, Clock, Coffee } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClientOnly } from "@/components/brewchain/ClientOnly";
import { updateOrderStatus } from "@/lib/brewchain/orders.functions";
import { formatIDR, shortAddr } from "@/lib/brewchain/format";
import { toast } from "sonner";

const listActiveOrders = createServerFn({ method: "GET" })
  .middleware([requireAdminWallet])
  .handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("orders")
    .select("*, order_items(*), transactions(*)")
    .in("status", ["pending", "paid", "preparing", "ready"])
    .order("created_at", { ascending: true });
  return data ?? [];
});

export const Route = createFileRoute("/kasir")({
  head: () => ({ meta: [{ title: "Kasir — BrewChain" }] }),
  component: () => <AppShell><ClientOnly><RequireAdminGate><Kasir /></RequireAdminGate></ClientOnly></AppShell>,
});

const NEXT_STATUS: Record<string, "paid" | "preparing" | "ready" | "completed" | null> = {
  pending: "paid", paid: "preparing", preparing: "ready", ready: "completed", completed: null,
};

function Kasir() {
  const { data, refetch } = useQuery({ queryKey: ["kasir-orders"], queryFn: () => listActiveOrders(), refetchInterval: 5000 });
  void refetch;
  const update = useMutation({
    mutationFn: (vars: { orderId: string; status: "paid" | "preparing" | "ready" | "completed" }) =>
      updateOrderStatus({ data: vars }),
    onSuccess: () => { toast.success("Status diperbarui"); refetch(); },
  });

  return (
    <div className="container mx-auto px-4 py-10">
      <div>
        <h1 className="font-display text-3xl font-bold">Dashboard Kasir</h1>
        <p className="text-muted-foreground">Kelola order baru, verifikasi QRIS/transfer, dan update status pesanan.</p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(data ?? []).map((o) => {
          const next = NEXT_STATUS[o.status];
          return (
            <Card key={o.id} className="rounded-2xl">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-mono font-semibold">{o.order_number}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{shortAddr(o.wallet_address, 6, 6)} · {o.payment_method}</div>
                  </div>
                  <Badge variant="secondary" className="rounded-full">{o.status}</Badge>
                </div>
                <ul className="mt-3 space-y-1 text-sm">
                  {(o.order_items ?? []).map((i) => (
                    <li key={i.id} className="flex justify-between"><span><Coffee className="mr-1 inline size-3 text-muted-foreground" />{i.quantity}× {i.product_name}</span><span className="text-muted-foreground">{formatIDR(i.subtotal_idr)}</span></li>
                  ))}
                </ul>
                <div className="mt-3 flex items-baseline justify-between border-t pt-3">
                  <span className="text-xs text-muted-foreground">Total</span>
                  <span className="font-display text-lg font-bold">{formatIDR(o.total_idr)}</span>
                </div>
                {next && (
                  <Button onClick={() => update.mutate({ orderId: o.id, status: next })} className="mt-3 w-full rounded-full gradient-coffee text-cream">
                    {next === "paid" ? <><CheckCircle2 className="size-4" /> Tandai Lunas</> :
                     next === "preparing" ? <><Clock className="size-4" /> Mulai Brewing</> :
                     next === "ready" ? <>🎉 Siap Diambil</> : <>Selesai</>}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
        {(data ?? []).length === 0 && <div className="col-span-full rounded-2xl border border-dashed py-12 text-center text-muted-foreground">Belum ada order aktif.</div>}
      </div>
    </div>
  );
}