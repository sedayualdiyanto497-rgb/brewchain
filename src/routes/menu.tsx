import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Heart, Search, Star, Plus, Flame } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listProducts, listCategories, toggleWishlist } from "@/lib/brewchain/catalog.functions";
import { formatIDR, formatSOL } from "@/lib/brewchain/format";
import { cart } from "@/lib/brewchain/cart-store";
import { useWalletAuth } from "@/contexts/WalletAuthProvider";
import { toast } from "sonner";

export const Route = createFileRoute("/menu")({
  head: () => ({
    meta: [
      { title: "Menu — BrewChain" },
      { name: "description", content: "Pilih kopi favoritmu — espresso, manual brew, signature, dan cold brew." },
    ],
  }),
  component: MenuPage,
});

function MenuPage() {
  const products = useQuery({ queryKey: ["products"], queryFn: () => listProducts() });
  const categories = useQuery({ queryKey: ["categories"], queryFn: () => listCategories() });
  const { session } = useWalletAuth();
  const toggleFav = useMutation({
    mutationFn: (productId: string) =>
      toggleWishlist({ data: { walletAddress: session!.walletAddress, productId } }),
    onSuccess: (r) => toast.success(r.added ? "Ditambahkan ke wishlist" : "Dihapus dari wishlist"),
  });

  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string | "all">("all");
  const [sort, setSort] = useState<"popular" | "rating" | "priceLow" | "priceHigh">("popular");
  const [promoOnly, setPromoOnly] = useState(false);

  const filtered = useMemo(() => {
    let list = products.data ?? [];
    if (cat !== "all") list = list.filter((p) => p.categories?.slug === cat);
    if (promoOnly) list = list.filter((p) => p.promo_pct > 0);
    if (query) list = list.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));
    if (sort === "rating") list = [...list].sort((a, b) => Number(b.rating_avg) - Number(a.rating_avg));
    if (sort === "priceLow") list = [...list].sort((a, b) => a.price_idr - b.price_idr);
    if (sort === "priceHigh") list = [...list].sort((a, b) => b.price_idr - a.price_idr);
    return list;
  }, [products.data, cat, query, sort, promoOnly]);

  return (
    <AppShell>
      <section className="border-b border-border/60 hero-grid-bg">
        <div className="container mx-auto px-4 py-14">
          <h1 className="font-display text-4xl font-bold md:text-5xl">Menu Kopi</h1>
          <p className="mt-2 max-w-xl text-muted-foreground">Setiap cangkir didampingi catatan asal biji dan komposisi. Bayar IDR atau SOL — terserah kamu.</p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari kopi…" className="rounded-full bg-card pl-9" />
            </div>
            <select value={sort} onChange={(e) => setSort(e.target.value as never)} className="rounded-full border border-input bg-card px-4 py-2 text-sm">
              <option value="popular">Populer</option>
              <option value="rating">Rating tertinggi</option>
              <option value="priceLow">Harga terendah</option>
              <option value="priceHigh">Harga tertinggi</option>
            </select>
            <Button variant={promoOnly ? "default" : "outline"} className="rounded-full" onClick={() => setPromoOnly((v) => !v)}>
              <Flame className="size-4" /> Promo
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <CatChip active={cat === "all"} onClick={() => setCat("all")}>Semua</CatChip>
            {(categories.data ?? []).map((c) => (
              <CatChip key={c.id} active={cat === c.slug} onClick={() => setCat(c.slug)}>
                <span>{c.icon}</span> {c.name}
              </CatChip>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-14">
        {products.isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-96 rounded-3xl bg-muted animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed py-20 text-center text-muted-foreground">Tidak ada kopi yang cocok dengan filter.</div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {filtered.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card className="group overflow-hidden rounded-3xl border-border/60 transition hover:shadow-elevated">
                  <Link to="/menu/$slug" params={{ slug: p.slug }}>
                    <div className="relative aspect-square overflow-hidden bg-muted">
                      {p.image_url && <img src={p.image_url} alt={p.name} className="size-full object-cover transition group-hover:scale-105" />}
                      <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                        {p.is_bestseller && <Badge className="rounded-full gradient-solana text-white border-0">Bestseller</Badge>}
                        {p.promo_pct > 0 && <Badge className="rounded-full bg-destructive text-destructive-foreground">-{p.promo_pct}%</Badge>}
                        {p.stock < 10 && <Badge variant="outline" className="rounded-full bg-card/90">Sisa {p.stock}</Badge>}
                      </div>
                    </div>
                  </Link>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs uppercase tracking-wider text-muted-foreground">{p.categories?.name}</div>
                        <h3 className="font-display text-lg font-semibold leading-tight">{p.name}</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => session ? toggleFav.mutate(p.id) : toast.error("Login wallet untuk wishlist")}
                        className="rounded-full p-1.5 hover:bg-secondary"
                      >
                        <Heart className="size-4" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center gap-1 text-sm">
                      <Star className="size-3.5 fill-amber-500 text-amber-500" /> {Number(p.rating_avg).toFixed(1)} <span className="text-muted-foreground">({p.rating_count})</span>
                    </div>
                    <div className="mt-3 flex items-baseline justify-between">
                      <div>
                        <div className="font-display text-xl font-bold">{formatIDR(p.price_idr)}</div>
                        <div className="text-xs text-muted-foreground">{formatSOL(Number(p.price_sol))}</div>
                      </div>
                      <Button
                        size="sm"
                        className="rounded-full gradient-coffee text-cream"
                        onClick={() => {
                          cart.add({
                            productId: p.id, name: p.name, imageUrl: p.image_url, priceIdr: p.price_idr,
                            priceSol: Number(p.price_sol), quantity: 1,
                          });
                          toast.success("Ditambahkan ke cart", { description: p.name });
                        }}
                      >
                        <Plus className="size-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}

function CatChip({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm transition ${
        active ? "gradient-coffee text-cream shadow-soft" : "bg-card text-foreground hover:bg-secondary"
      }`}
    >
      {children}
    </button>
  );
}