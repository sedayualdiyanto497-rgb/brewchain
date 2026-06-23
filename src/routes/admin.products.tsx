import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClientOnly } from "@/components/brewchain/ClientOnly";
import { listProducts } from "@/lib/brewchain/catalog.functions";
import { formatIDR, formatSOL } from "@/lib/brewchain/format";

export const Route = createFileRoute("/admin/products")({
  component: () => <ClientOnly><AdminProducts /></ClientOnly>,
});

function AdminProducts() {
  const { data } = useQuery({ queryKey: ["products"], queryFn: () => listProducts() });
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Produk</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3 text-right">Harga IDR</th>
                <th className="px-4 py-3 text-right">Harga SOL</th>
                <th className="px-4 py-3 text-right">Stok</th>
                <th className="px-4 py-3 text-right">Rating</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(data ?? []).map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="size-10 overflow-hidden rounded-lg bg-muted">{p.image_url && <img src={p.image_url} alt={p.name} className="size-full object-cover" />}</div>
                      <div>
                        <div className="font-semibold">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.origin}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{p.categories?.name}</td>
                  <td className="px-4 py-3 text-right">{formatIDR(p.price_idr)}</td>
                  <td className="px-4 py-3 text-right">{formatSOL(Number(p.price_sol))}</td>
                  <td className="px-4 py-3 text-right">{p.stock}</td>
                  <td className="px-4 py-3 text-right">{Number(p.rating_avg).toFixed(1)} ({p.rating_count})</td>
                  <td className="px-4 py-3">
                    {p.is_bestseller && <Badge className="rounded-full gradient-solana text-white border-0">Best</Badge>}
                    {p.promo_pct > 0 && <Badge className="ml-1 rounded-full bg-destructive">-{p.promo_pct}%</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}