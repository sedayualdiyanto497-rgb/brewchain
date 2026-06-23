import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Award, Heart, Star, Trophy } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClientOnly } from "@/components/brewchain/ClientOnly";
import { useWalletAuth } from "@/contexts/WalletAuthProvider";
import { getProfile, updateNickname } from "@/lib/brewchain/profile.functions";
import { getWishlist, listMemberships } from "@/lib/brewchain/catalog.functions";
import { formatIDR, shortAddr } from "@/lib/brewchain/format";
import { toast } from "sonner";
import { RequireWallet } from "@/routes/history";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — BrewChain" }] }),
  component: () => <AppShell><ClientOnly><ProfilePage /></ClientOnly></AppShell>,
});

function ProfilePage() {
  const { session } = useWalletAuth();
  const profile = useQuery({
    queryKey: ["profile", session?.walletAddress],
    queryFn: () => getProfile({ data: { walletAddress: session!.walletAddress } }),
    enabled: !!session,
  });
  const wishlist = useQuery({
    queryKey: ["wishlist", session?.walletAddress],
    queryFn: () => getWishlist({ data: { walletAddress: session!.walletAddress } }),
    enabled: !!session,
  });
  const memberships = useQuery({ queryKey: ["memberships"], queryFn: () => listMemberships() });
  const [nickname, setNickname] = useState("");
  const update = useMutation({
    mutationFn: () => updateNickname({ data: { walletAddress: session!.walletAddress, nickname } }),
    onSuccess: () => { toast.success("Nickname diperbarui"); profile.refetch(); },
  });

  if (!session) return <RequireWallet />;
  const p = profile.data;

  return (
    <div className="container mx-auto px-4 py-12">
      <Card className="overflow-hidden rounded-3xl shadow-elevated">
        <div className="h-32 gradient-solana" />
        <CardContent className="-mt-12 p-6">
          <div className="flex items-end gap-4">
            <div className="grid size-24 place-items-center rounded-3xl bg-card font-display text-3xl font-bold shadow-soft">
              {(p?.nickname?.[0] ?? "?").toUpperCase()}
            </div>
            <div className="flex-1">
              <h1 className="font-display text-2xl font-bold">{p?.nickname ?? "Belum ada nickname"}</h1>
              <div className="font-mono text-xs text-muted-foreground">{shortAddr(session.walletAddress, 8, 8)}</div>
            </div>
            <Badge className="rounded-full gradient-coffee text-cream"><Trophy className="size-3" /> {p?.membership_level ?? "bronze"}</Badge>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Stat label="Total Pesanan" value={String(p?.total_orders ?? 0)} />
            <Stat label="Total Belanja" value={formatIDR(p?.total_spent_idr ?? 0)} />
            <Stat label="Loyalty Points" value={String(p?.total_points ?? 0)} icon={<Award className="size-4" />} />
          </div>

          <div className="mt-6">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Update Nickname</label>
            <div className="mt-1 flex gap-2">
              <Input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder={p?.nickname ?? "Tulis nickname…"} maxLength={40} />
              <Button onClick={() => update.mutate()} disabled={!nickname.trim()}>Simpan</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-bold">Wishlist <Heart className="inline size-5 text-rose-500" /></h2>
        {(wishlist.data ?? []).length === 0 ? (
          <p className="mt-3 text-muted-foreground">Belum ada kopi di wishlist.</p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(wishlist.data ?? []).map((p) => p && (
              <Card key={p.id} className="overflow-hidden rounded-2xl">
                <div className="aspect-square bg-muted">{p.image_url && <img src={p.image_url} alt={p.name} className="size-full object-cover" />}</div>
                <CardContent className="p-3">
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{formatIDR(p.price_idr)} · ⭐ {Number(p.rating_avg).toFixed(1)}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-bold">Membership Tiers</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          {(memberships.data ?? []).map((m) => (
            <Card key={m.level} className="rounded-2xl">
              <CardContent className="p-4">
                <div className="inline-block size-3 rounded-full" style={{ backgroundColor: m.color }} />
                <div className="mt-2 font-display text-lg font-semibold">{m.display_name}</div>
                <div className="text-xs text-muted-foreground">Min belanja {formatIDR(m.min_spend_idr)}</div>
                <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                  {(m.perks as string[]).map((p) => <li key={p}>• {p}</li>)}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-secondary/40 p-4">
      <div className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground">{label}{icon}</div>
      <div className="mt-1 font-display text-2xl font-bold">{value}</div>
    </div>
  );
}