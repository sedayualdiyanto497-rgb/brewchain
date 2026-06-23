import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2, Minus, Plus, ShoppingBag, Tag } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ClientOnly } from "@/components/brewchain/ClientOnly";
import { useCart, cart } from "@/lib/brewchain/cart-store";
import { formatIDR, formatSOL } from "@/lib/brewchain/format";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Cart — BrewChain" }] }),
  component: () => <AppShell><ClientOnly><CartPage /></ClientOnly></AppShell>,
});

function CartPage() {
  const items = useCart();
  const [voucher, setVoucher] = useState("");
  const navigate = useNavigate();

  const subtotal = items.reduce((s, i) => s + i.priceIdr * i.quantity, 0);
  const subtotalSol = items.reduce((s, i) => s + i.priceSol * i.quantity, 0);
  const discount = voucher.trim().toUpperCase() === "BREW10" && subtotal >= 30000 ? Math.round(subtotal * 0.1)
    : voucher.trim().toUpperCase() === "SOLANA20" && subtotal >= 50000 ? Math.round(subtotal * 0.2)
    : 0;
  const tax = Math.round((subtotal - discount) * 0.1);
  const total = subtotal - discount + tax;

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <ShoppingBag className="mx-auto size-12 text-muted-foreground" />
        <h1 className="mt-4 font-display text-3xl font-bold">Cart kamu masih kosong</h1>
        <p className="mt-2 text-muted-foreground">Yuk pilih kopi favorit dulu.</p>
        <Button asChild className="mt-6 rounded-full gradient-coffee text-cream"><Link to="/menu">Lihat Menu</Link></Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto grid gap-8 px-4 py-12 md:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <h1 className="font-display text-3xl font-bold">Keranjang</h1>
        {items.map((i) => (
          <Card key={i.productId} className="rounded-2xl">
            <CardContent className="flex gap-4 p-4">
              <div className="size-20 shrink-0 overflow-hidden rounded-xl bg-muted">
                {i.imageUrl && <img src={i.imageUrl} alt={i.name} className="size-full object-cover" />}
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{i.name}</h3>
                    <div className="text-sm text-muted-foreground">{formatIDR(i.priceIdr)} · {formatSOL(i.priceSol)}</div>
                  </div>
                  <button type="button" onClick={() => cart.remove(i.productId)} className="rounded-full p-1 hover:bg-secondary">
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="outline" className="size-8 rounded-full" onClick={() => cart.setQty(i.productId, i.quantity - 1)}><Minus className="size-3" /></Button>
                    <span className="w-6 text-center font-mono">{i.quantity}</span>
                    <Button size="icon" variant="outline" className="size-8 rounded-full" onClick={() => cart.setQty(i.productId, i.quantity + 1)}><Plus className="size-3" /></Button>
                  </div>
                  <div className="font-semibold">{formatIDR(i.priceIdr * i.quantity)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="h-fit rounded-2xl shadow-soft md:sticky md:top-24">
        <CardContent className="p-6">
          <h2 className="font-display text-xl font-bold">Ringkasan</h2>
          <div className="mt-4 space-y-2 text-sm">
            <Row label="Subtotal" value={formatIDR(subtotal)} />
            <Row label="Diskon" value={`- ${formatIDR(discount)}`} />
            <Row label="Pajak (10%)" value={formatIDR(tax)} />
            <div className="my-3 border-t" />
            <Row label="Total" value={formatIDR(total)} bold />
            <Row label="Setara" value={formatSOL(subtotalSol)} muted />
          </div>
          <div className="mt-5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Voucher</label>
            <div className="mt-1 flex gap-2">
              <Input value={voucher} onChange={(e) => setVoucher(e.target.value)} placeholder="BREW10 / SOLANA20" />
              <Button variant="outline" type="button"><Tag className="size-4" /></Button>
            </div>
          </div>
          <Button className="mt-6 w-full rounded-full gradient-coffee text-cream" size="lg"
            onClick={() => navigate({ to: "/checkout", search: { voucher: voucher.trim().toUpperCase() || undefined } as never })}>
            Lanjut ke Checkout
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value, bold, muted }: { label: string; value: string; bold?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-muted-foreground" : ""}>{label}</span>
      <span className={`${bold ? "font-display text-xl font-bold" : ""} ${muted ? "text-muted-foreground" : ""}`}>{value}</span>
    </div>
  );
}