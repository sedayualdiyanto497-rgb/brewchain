import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatSOL, shortAddr } from "@/lib/brewchain/format";
import { createServerFn } from "@tanstack/react-start";

const listAllTransactions = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("transactions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  return data ?? [];
});

export const Route = createFileRoute("/blockchain")({
  head: () => ({ meta: [{ title: "Blockchain Explorer — BrewChain" }] }),
  component: BlockchainPage,
});

function BlockchainPage() {
  const { data, isLoading } = useQuery({ queryKey: ["chain-tx"], queryFn: () => listAllTransactions(), refetchInterval: 10000 });

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold">Blockchain Explorer</h1>
            <p className="mt-1 text-muted-foreground">Setiap pembayaran on-chain BrewChain di Solana Devnet, transparan untuk semua.</p>
          </div>
          <Badge className="rounded-full gradient-solana text-white border-0">Devnet · Live</Badge>
        </div>

        <Card className="mt-8 rounded-2xl">
          <CardContent className="p-0">
            {isLoading ? <div className="p-10 text-center text-muted-foreground">Memuat…</div> :
              (data ?? []).length === 0 ? <div className="p-10 text-center text-muted-foreground">Belum ada transaksi tercatat.</div> :
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Wallet</th>
                      <th className="px-4 py-3">Signature</th>
                      <th className="px-4 py-3">Block Time</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(data ?? []).map((t) => (
                      <tr key={t.id}>
                        <td className="px-4 py-3 font-mono">{shortAddr(t.wallet_address, 6, 6)}</td>
                        <td className="px-4 py-3 font-mono text-xs">{t.tx_signature ? shortAddr(t.tx_signature, 8, 8) : "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{t.block_time ? new Date(t.block_time * 1000).toLocaleString("id-ID") : "—"}</td>
                        <td className="px-4 py-3 text-right font-semibold">{formatSOL(Number(t.total_sol))}</td>
                        <td className="px-4 py-3"><Badge variant="secondary" className="rounded-full">{t.status}</Badge></td>
                        <td className="px-4 py-3 text-right">
                          {t.explorer_url && <Button asChild size="sm" variant="ghost" className="gap-1"><a href={t.explorer_url} target="_blank" rel="noreferrer"><ExternalLink className="size-3" /> Solana Explorer</a></Button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            }
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}