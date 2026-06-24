import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { Bell, Coffee, Radio, ShoppingBag, Sparkles, Trophy, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClientOnly } from "@/components/brewchain/ClientOnly";
import { useWalletAuth } from "@/contexts/WalletAuthProvider";
import { getProfile, getNotifications } from "@/lib/brewchain/profile.functions";
import { listOrders } from "@/lib/brewchain/orders.functions";
import { listProducts } from "@/lib/brewchain/catalog.functions";
import { formatIDR, formatSOL, shortAddr } from "@/lib/brewchain/format";
import { RequireWallet } from "@/routes/history";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — BrewChain" }] }),
  component: () => <AppShell><ClientOnly><DashboardPage /></ClientOnly></AppShell>,
});

function DashboardPage() {
  const { session } = useWalletAuth();
  const { connection } = useConnection();
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const qc = useQueryClient();
  const [liveBeat, setLiveBeat] = useState(0);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    (async () => {
      try {
        const bal = await connection.getBalance(new PublicKey(session.walletAddress));
        if (!cancelled) setSolBalance(bal / LAMPORTS_PER_SOL);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [session, connection]);

  const profile = useQuery({
    queryKey: ["profile", session?.walletAddress],
    queryFn: () => getProfile(),
    enabled: !!session,
  });
  const orders = useQuery({
    queryKey: ["orders", session?.walletAddress],
    queryFn: () => listOrders(),
    enabled: !!session,
  });
  const notifs = useQuery({
    queryKey: ["notifs", session?.walletAddress],
    queryFn: () => getNotifications(),
    enabled: !!session,
  });
  const products = useQuery({ queryKey: ["products"], queryFn: () => listProducts() });

  // Realtime: refresh orders & notifications when this wallet's rows change
  useEffect(() => {
    if (!session) return;
    const wallet = session.walletAddress;
    const channel = supabase
      .channel(`user-${wallet}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `wallet_address=eq.${wallet}` }, () => {
        qc.invalidateQueries({ queryKey: ["orders", wallet] });
        qc.invalidateQueries({ queryKey: ["profile", wallet] });
        setLiveBeat((n) => n + 1);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `wallet_address=eq.${wallet}` }, () => {
        qc.invalidateQueries({ queryKey: ["notifs", wallet] });
        setLiveBeat((n) => n + 1);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session, qc]);

  if (!session) return <RequireWallet />;
  const p = profile.data;
  const ord = orders.data ?? [];
  const recent = ord.slice(0, 5);
  const favorites = (products.data ?? []).filter((x) => x.is_bestseller).slice(0, 3);

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Selamat datang kembali</p>
          <h1 className="font-display text-4xl font-bold">Halo, {p?.nickname ?? shortAddr(session.walletAddress)} ☕</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="rounded-full gap-1">
            <Radio className={`size-3 ${liveBeat ? "text-emerald-500 animate-pulse" : "text-muted-foreground"}`} /> Live
          </Badge>
          <Badge className="rounded-full gradient-coffee text-cream"><Trophy className="size-3" /> {p?.membership_level ?? "bronze"}</Badge>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-4">
        <KPI icon={Wallet} label="SOL Balance" value={solBalance === null ? "…" : `${solBalance.toFixed(4)} SOL`} accent />
        <KPI icon={ShoppingBag} label="Total Pesanan" value={String(p?.total_orders ?? 0)} />
        <KPI icon={Coffee} label="Total Belanja" value={formatIDR(p?.total_spent_idr ?? 0)} />
        <KPI icon={Sparkles} label="Loyalty Point" value={String(p?.total_points ?? 0)} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="rounded-2xl lg:col-span-2">
          <CardContent className="p-5">
            <div className="flex items-center justify-between"><h2 className="font-display text-lg font-semibold">Riwayat Terakhir</h2><Button asChild size="sm" variant="ghost"><Link to="/history">Semua</Link></Button></div>
            {recent.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Belum ada pesanan.</p> :
              <ul className="mt-3 divide-y">
                {recent.map((o) => (
                  <li key={o.id} className="flex items-center justify-between py-3">
                    <div>
                      <div className="font-mono text-sm font-semibold">{o.order_number}</div>
                      <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("id-ID")}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatIDR(o.total_idr)}</div>
                      <Badge variant="secondary" className="rounded-full text-xs">{o.status}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            }
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between"><h2 className="font-display text-lg font-semibold">Notifikasi</h2><Bell className="size-4 text-muted-foreground" /></div>
            <ul className="mt-3 space-y-3">
              {(notifs.data ?? []).slice(0, 5).map((n) => (
                <li key={n.id} className="rounded-xl border border-border/60 p-3">
                  <div className="text-sm font-semibold">{n.title}</div>
                  <div className="text-xs text-muted-foreground">{n.message}</div>
                </li>
              ))}
              {(notifs.data ?? []).length === 0 && <p className="text-xs text-muted-foreground">Belum ada notifikasi.</p>}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="font-display text-lg font-semibold">Menu Favorit</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          {favorites.map((f) => (
            <Card key={f.id} className="overflow-hidden rounded-2xl">
              <div className="aspect-[16/9] bg-muted">{f.image_url && <img src={f.image_url} alt={f.name} className="size-full object-cover" />}</div>
              <CardContent className="p-4">
                <div className="font-semibold">{f.name}</div>
                <div className="text-xs text-muted-foreground">{formatIDR(f.price_idr)} · {formatSOL(Number(f.price_sol))}</div>
                <Button asChild size="sm" className="mt-3 rounded-full gradient-coffee text-cream"><Link to="/menu/$slug" params={{ slug: f.slug }}>Pesan</Link></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function KPI({ icon: Icon, label, value, accent }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; accent?: boolean }) {
  return (
    <Card className={`rounded-2xl ${accent ? "gradient-solana text-white border-0 shadow-glow-sol" : ""}`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between text-xs uppercase tracking-wider opacity-80">{label}<Icon className="size-4" /></div>
        <div className="mt-2 font-display text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}