import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Heart, Plus, Star } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getProductBySlug } from "@/lib/brewchain/catalog.functions";
import { formatIDR, formatSOL, shortAddr } from "@/lib/brewchain/format";
import { cart } from "@/lib/brewchain/cart-store";
import { toast } from "sonner";

export const Route = createFileRoute("/menu/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.replace(/-/g, " ")} — BrewChain` },
    ],
  }),
  component: DetailPage,
});

function DetailPage() {
  const { slug } = useParams({ from: "/menu/$slug" });
  const { data, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => getProductBySlug({ data: { slug } }),
  });

  if (isLoading) return <AppShell><div className="container mx-auto px-4 py-20">Memuat…</div></AppShell>;
  if (!data?.product) return <AppShell><div className="container mx-auto px-4 py-20">Produk tidak ditemukan.</div></AppShell>;

  const p = data.product;

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-10">
        <Link to="/menu" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Kembali ke menu
        </Link>
        <div className="mt-6 grid gap-10 md:grid-cols-2">
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="relative aspect-square overflow-hidden rounded-[2rem] shadow-elevated">
            {p.image_url && <img src={p.image_url} alt={p.name} className="size-full object-cover" />}
            <div className="absolute left-4 top-4 flex gap-1.5">
              {p.is_bestseller && <Badge className="rounded-full gradient-solana text-white border-0">Bestseller</Badge>}
              {p.promo_pct > 0 && <Badge className="rounded-full bg-destructive">-{p.promo_pct}%</Badge>}
            </div>
          </motion.div>

          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{p.categories?.name}</div>
            <h1 className="mt-1 font-display text-4xl font-bold md:text-5xl">{p.name}</h1>
            <div className="mt-3 flex items-center gap-3 text-sm">
              <span className="inline-flex items-center gap-1"><Star className="size-4 fill-amber-500 text-amber-500" /> {Number(p.rating_avg).toFixed(1)}</span>
              <span className="text-muted-foreground">{p.rating_count} ulasan</span>
              <span className="text-muted-foreground">· Stok {p.stock}</span>
            </div>
            <p className="mt-5 text-muted-foreground">{p.description}</p>

            <div className="mt-6 grid grid-cols-2 gap-3 rounded-2xl bg-card p-4 shadow-soft">
              <Info label="Komposisi" value={p.composition ?? "-"} />
              <Info label="Asal biji" value={p.origin ?? "-"} />
              <Info label="Kalori" value={`${(p.nutrition as Record<string, number> | null)?.calories ?? "-"} kkal`} />
              <Info label="Kafein" value={`${(p.nutrition as Record<string, number> | null)?.caffeine_mg ?? "-"} mg`} />
            </div>

            <div className="mt-7 flex items-baseline gap-4">
              <div className="font-display text-4xl font-bold">{formatIDR(p.price_idr)}</div>
              <div className="text-sm text-muted-foreground">{formatSOL(Number(p.price_sol))}</div>
            </div>

            <div className="mt-6 flex gap-3">
              <Button size="lg" className="gradient-coffee text-cream rounded-full" onClick={() => {
                cart.add({ productId: p.id, name: p.name, imageUrl: p.image_url, priceIdr: p.price_idr, priceSol: Number(p.price_sol), quantity: 1 });
                toast.success("Ditambahkan ke cart");
              }}>
                <Plus className="size-4" /> Add to Cart
              </Button>
              <Button size="lg" variant="outline" className="rounded-full"><Heart className="size-4" /> Favorit</Button>
            </div>
          </div>
        </div>

        {/* Reviews */}
        <div className="mt-16">
          <h2 className="font-display text-2xl font-bold">Review pelanggan</h2>
          {data.reviews.length === 0 ? (
            <p className="mt-3 text-muted-foreground">Belum ada review.</p>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {data.reviews.map((r) => (
                <Card key={r.id} className="rounded-2xl">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="font-mono text-xs text-muted-foreground">{shortAddr(r.wallet_address)}</div>
                      <div className="flex gap-0.5 text-amber-500">{[1, 2, 3, 4, 5].map((s) => <Star key={s} className={`size-3.5 ${s <= r.rating ? "fill-current" : ""}`} />)}</div>
                    </div>
                    <p className="mt-2 text-sm">{r.comment}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Related */}
        {data.related.length > 0 && (
          <div className="mt-16">
            <h2 className="font-display text-2xl font-bold">Kopi terkait</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {data.related.map((r) => (
                <Link key={r.id} to="/menu/$slug" params={{ slug: r.slug }} className="group">
                  <div className="aspect-square overflow-hidden rounded-2xl bg-muted">
                    {r.image_url && <img src={r.image_url} alt={r.name} className="size-full object-cover transition group-hover:scale-105" />}
                  </div>
                  <div className="mt-2 font-semibold">{r.name}</div>
                  <div className="text-sm text-muted-foreground">{formatIDR(r.price_idr)}</div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-medium">{value}</div>
    </div>
  );
}