import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, Radio, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClientOnly } from "@/components/brewchain/ClientOnly";
import { listAllOrders, updateOrderStatus, verifyPayment } from "@/lib/brewchain/orders.functions";
import { formatIDR, formatSOL, shortAddr } from "@/lib/brewchain/format";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/orders")({
  component: () => <ClientOnly><AdminOrders /></ClientOnly>,
});

const STATUSES = ["pending", "paid", "preparing", "ready", "completed", "cancelled"] as const;
type Status = (typeof STATUSES)[number];

const statusStyles: Record<Status, string> = {
  pending: "bg-amber-500/15 text-amber-700",
  paid: "bg-blue-500/15 text-blue-700",
  preparing: "bg-purple-500/15 text-purple-700",
  ready: "bg-emerald-500/15 text-emerald-700",
  completed: "bg-emerald-600/20 text-emerald-800",
  cancelled: "bg-rose-500/15 text-rose-700",
};

function AdminOrders() {
  const qc = useQueryClient();
  const [live, setLive] = useState(false);
  const { data: orders = [] } = useQuery({ queryKey: ["admin-orders"], queryFn: () => listAllOrders() });

  useEffect(() => {
    const ch = supabase
      .channel("admin-orders-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        qc.invalidateQueries({ queryKey: ["admin-orders"] });
        qc.invalidateQueries({ queryKey: ["admin-stats"] });
        setLive(true);
        setTimeout(() => setLive(false), 800);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, () => {
        qc.invalidateQueries({ queryKey: ["admin-orders"] });
        qc.invalidateQueries({ queryKey: ["admin-stats"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const mUpdate = useMutation({
    mutationFn: (vars: { orderId: string; status: Status }) => updateOrderStatus({ data: vars }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-orders"] }); toast.success("Status diperbarui"); },
    onError: (e) => toast.error("Gagal", { description: (e as Error).message }),
  });

  const mVerify = useMutation({
    mutationFn: (orderId: string) => verifyPayment({ data: { orderId } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-orders"] }); toast.success("Pembayaran terverifikasi"); },
  });

  const counts = STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = orders.filter((o) => o.status === s).length;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <Badge key={s} variant="outline" className={`rounded-full ${statusStyles[s]}`}>
              {s} · {counts[s] ?? 0}
            </Badge>
          ))}
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-700">
          <Radio className={`size-3 ${live ? "animate-pulse text-emerald-600" : ""}`} /> Realtime stream
        </span>
      </div>

      <Card className="rounded-2xl">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Tx Blockchain</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => {
                  const tx = (o.transactions ?? [])[0];
                  return (
                    <TableRow key={o.id}>
                      <TableCell>
                        <div className="font-mono text-sm font-semibold">{o.order_number}</div>
                        <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("id-ID")}</div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{shortAddr(o.wallet_address)}</TableCell>
                      <TableCell className="text-xs">{(o.order_items ?? []).length} item</TableCell>
                      <TableCell>
                        <div className="font-semibold">{formatIDR(o.total_idr)}</div>
                        <div className="text-xs text-muted-foreground">{formatSOL(Number(o.total_sol))}</div>
                      </TableCell>
                      <TableCell>
                        {tx ? (
                          <a href={tx.explorer_url ?? "#"} target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline">
                            {(tx.tx_signature ?? "").slice(0, 10)}… <ExternalLink className="size-3" />
                          </a>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                        {tx && <div className="text-[10px] uppercase text-muted-foreground">{tx.network}</div>}
                      </TableCell>
                      <TableCell>
                        <Select value={o.status} onValueChange={(v) => mUpdate.mutate({ orderId: o.id, status: v as Status })}>
                          <SelectTrigger className="h-8 w-32 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        {tx && o.status === "paid" && (
                          <Button size="sm" variant="outline" className="gap-1" onClick={() => mVerify.mutate(o.id)}>
                            <ShieldCheck className="size-3.5" /> Verifikasi
                          </Button>
                        )}
                        {o.status === "completed" && <CheckCircle2 className="ml-auto size-4 text-emerald-500" />}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {orders.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">Belum ada pesanan.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
