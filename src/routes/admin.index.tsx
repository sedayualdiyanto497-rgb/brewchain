import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, Coffee, ShoppingBag, Users, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ClientOnly } from "@/components/brewchain/ClientOnly";
import { adminStats } from "@/lib/brewchain/orders.functions";
import { formatIDR } from "@/lib/brewchain/format";

export const Route = createFileRoute("/admin/")({
  component: () => <ClientOnly><AdminOverview /></ClientOnly>,
});

function AdminOverview() {
  const { data } = useQuery({ queryKey: ["admin-stats"], queryFn: () => adminStats() });
  return (
    <div>
      <div className="grid gap-4 md:grid-cols-5">
        <Kpi icon={Wallet} label="Revenue" value={formatIDR(data?.revenue ?? 0)} accent />
        <Kpi icon={Users} label="Customer" value={String(data?.totalCustomers ?? 0)} />
        <Kpi icon={ShoppingBag} label="Order" value={String(data?.totalOrders ?? 0)} />
        <Kpi icon={Coffee} label="Produk" value={String(data?.totalProducts ?? 0)} />
        <Kpi icon={Activity} label="Tx Blockchain" value={String(data?.totalTx ?? 0)} />
      </div>

      <Card className="mt-6 rounded-2xl">
        <CardContent className="p-5">
          <h2 className="font-display text-lg font-semibold">Order Terbaru</h2>
          <ul className="mt-3 divide-y text-sm">
            {(data?.orders ?? []).slice(0, 10).map((o, idx) => (
              <li key={idx} className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">{new Date(o.created_at).toLocaleString("id-ID")}</span>
                <span className="font-semibold">{formatIDR(o.total_idr)}</span>
                <span className="text-xs">{o.status}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, accent }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; accent?: boolean }) {
  return (
    <Card className={`rounded-2xl ${accent ? "gradient-solana text-white border-0 shadow-glow-sol" : ""}`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between text-xs uppercase tracking-wider opacity-80">{label}<Icon className="size-4" /></div>
        <div className="mt-2 font-display text-xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}