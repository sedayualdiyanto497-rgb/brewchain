import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Star } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClientOnly } from "@/components/brewchain/ClientOnly";
import { useWalletAuth } from "@/contexts/WalletAuthProvider";
import { listOrders } from "@/lib/brewchain/orders.functions";
import { formatIDR, formatSOL, shortAddr } from "@/lib/brewchain/format";

export const Route = createFileRoute("/history")({
  head: () => ({ meta: [{ title: "Riwayat — BrewChain" }] }),
  component: () => <AppShell><ClientOnly><HistoryPage /></ClientOnly></AppShell>,
});

function HistoryPage() {
  const { session } = useWalletAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["orders", session?.walletAddress],
    queryFn: () => listOrders({ data: { walletAddress: session!.walletAddress } }),
    enabled: !!session,
  });

  if (!session) return <RequireWallet />;

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="font-display text-3xl font-bold">Riwayat Transaksi</h1>
      <p className="mt-1 text-muted-foreground">Semua pesanan dan jejak blockchainnya.</p>

      {isLoading ? <p className="mt-10 text-muted-foreground">Memuat…</p>
        : (data ?? []).length === 0 ? <p className="mt-10 text-muted-foreground">Belum ada transaksi.</p>
        : (
          <div className="mt-8 grid gap-4">
            {data!.map((o) => {
              const tx = o.transactions?.[0];
              return (
                <Card key={o.id} className="rounded-2xl">
                  <CardContent className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold">{o.order_number}</span>
                        <Badge variant="secondary" className="rounded-full text-xs">{o.status}</Badge>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {new Date(o.created_at).toLocaleString("id-ID")} · {(o.order_items ?? []).map((i) => `${i.quantity}× ${i.product_name}`).join(", ")}
                      </div>
                      <div className="mt-2 text-sm">
                        <span className="font-semibold">{formatIDR(o.total_idr)}</span> · <span className="text-muted-foreground">{formatSOL(Number(o.total_sol))}</span>
                      </div>
                      {tx?.tx_signature && (
                        <div className="mt-1 font-mono text-xs text-muted-foreground">Sig: {shortAddr(tx.tx_signature, 8, 8)}</div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 md:flex-col">
                      <Button asChild size="sm" variant="outline" className="rounded-full"><Link to="/tracking/$orderId" params={{ orderId: o.id }}>Lacak</Link></Button>
                      {tx?.explorer_url && <Button asChild size="sm" className="rounded-full gradient-solana text-white"><a href={tx.explorer_url} target="_blank" rel="noreferrer"><ExternalLink className="size-3.5" /> Explorer</a></Button>}
                      <Button size="sm" variant="ghost" className="rounded-full"><Star className="size-3.5" /> Review</Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
    </div>
  );
}

export function RequireWallet() {
  return (
    <div className="container mx-auto px-4 py-24 text-center">
      <h1 className="font-display text-3xl font-bold">Login wallet terlebih dahulu</h1>
      <p className="mt-2 text-muted-foreground">Hubungkan Phantom / Solflare / Backpack lalu sign message.</p>
    </div>
  );
}