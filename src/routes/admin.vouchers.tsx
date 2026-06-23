import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClientOnly } from "@/components/brewchain/ClientOnly";
import { listVouchers } from "@/lib/brewchain/catalog.functions";
import { formatIDR } from "@/lib/brewchain/format";

export const Route = createFileRoute("/admin/vouchers")({
  component: () => <ClientOnly><AdminVouchers /></ClientOnly>,
});

function AdminVouchers() {
  const { data } = useQuery({ queryKey: ["vouchers"], queryFn: () => listVouchers() });
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {(data ?? []).map((v) => (
        <Card key={v.id} className="rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Kode</div>
                <div className="mt-1 font-mono text-xl font-bold">{v.code}</div>
              </div>
              <Badge className="rounded-full gradient-solana text-white border-0">-{v.discount_pct}%</Badge>
            </div>
            <p className="mt-2 text-sm">{v.description}</p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div><div className="opacity-70">Min Order</div><div className="font-medium text-foreground">{formatIDR(v.min_order_idr)}</div></div>
              <div><div className="opacity-70">Pemakaian</div><div className="font-medium text-foreground">{v.used_count}/{v.max_uses}</div></div>
              <div className="col-span-2"><div className="opacity-70">Berlaku hingga</div><div className="font-medium text-foreground">{v.expires_at ? new Date(v.expires_at).toLocaleDateString("id-ID") : "Tanpa batas"}</div></div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}