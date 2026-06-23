import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil, Plus, Power, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClientOnly } from "@/components/brewchain/ClientOnly";
import { adminListProducts, createProduct, deleteProduct, updateProduct } from "@/lib/brewchain/admin.functions";
import { formatIDR, formatSOL } from "@/lib/brewchain/format";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/products")({
  component: () => <ClientOnly><AdminProducts /></ClientOnly>,
});

type Row = Awaited<ReturnType<typeof adminListProducts>>[number];

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function AdminProducts() {
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery({ queryKey: ["admin-products"], queryFn: () => adminListProducts() });
  const [editing, setEditing] = useState<Row | null>(null);
  const [open, setOpen] = useState(false);

  const mDelete = useMutation({
    mutationFn: (id: string) => deleteProduct({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-products"] }); toast.success("Produk dinonaktifkan"); },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold">Kelola Produk</h2>
          <p className="text-xs text-muted-foreground">Tambah, ubah, atau nonaktifkan menu kopi.</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button className="gradient-coffee text-cream gap-1" onClick={() => { setEditing(null); setOpen(true); }}>
              <Plus className="size-4" /> Produk Baru
            </Button>
          </DialogTrigger>
          <ProductFormDialog editing={editing} onDone={() => { setOpen(false); setEditing(null); qc.invalidateQueries({ queryKey: ["admin-products"] }); }} />
        </Dialog>
      </div>

      <Card className="rounded-2xl">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produk</TableHead>
                  <TableHead>Harga IDR / SOL</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="size-10 overflow-hidden rounded-lg bg-muted">
                          {p.image_url && <img src={p.image_url} alt={p.name} className="size-full object-cover" />}
                        </div>
                        <div>
                          <div className="font-semibold">{p.name}</div>
                          <div className="font-mono text-xs text-muted-foreground">{p.slug}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>{formatIDR(p.price_idr)}</div>
                      <div className="text-xs text-muted-foreground">{formatSOL(Number(p.price_sol))}</div>
                    </TableCell>
                    <TableCell>{p.stock}</TableCell>
                    <TableCell>{Number(p.rating_avg).toFixed(1)} ({p.rating_count})</TableCell>
                    <TableCell>
                      {p.is_active
                        ? <Badge className="rounded-full bg-emerald-500/15 text-emerald-700">Aktif</Badge>
                        : <Badge variant="outline" className="rounded-full">Nonaktif</Badge>}
                      {p.is_bestseller && <Badge className="ml-1 rounded-full gradient-solana text-white border-0">Best</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}><Pencil className="size-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => mDelete.mutate(p.id)}><Power className="size-4 text-rose-500" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">Belum ada produk.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProductFormDialog({ editing, onDone }: { editing: Row | null; onDone: () => void }) {
  const [name, setName] = useState(editing?.name ?? "");
  const [slug, setSlug] = useState(editing?.slug ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [imageUrl, setImageUrl] = useState(editing?.image_url ?? "");
  const [priceIdr, setPriceIdr] = useState(String(editing?.price_idr ?? 0));
  const [priceSol, setPriceSol] = useState(String(editing?.price_sol ?? 0));
  const [stock, setStock] = useState(String(editing?.stock ?? 0));
  const [isBest, setIsBest] = useState(editing?.is_bestseller ?? false);
  const [promo, setPromo] = useState(String(editing?.promo_pct ?? 0));
  const [isActive, setIsActive] = useState(editing?.is_active ?? true);

  const mSave = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        slug: slug || slugify(name),
        description: description || null,
        image_url: imageUrl || null,
        price_idr: Number(priceIdr),
        price_sol: Number(priceSol),
        stock: Number(stock),
        is_bestseller: isBest,
        promo_pct: Number(promo),
        is_active: isActive,
      };
      if (editing) return updateProduct({ data: { id: editing.id, ...payload } });
      return createProduct({ data: payload });
    },
    onSuccess: () => { toast.success(editing ? "Produk diperbarui" : "Produk dibuat"); onDone(); },
    onError: (e) => toast.error("Gagal", { description: (e as Error).message }),
  });

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>{editing ? "Edit Produk" : "Produk Baru"}</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <Field label="Nama"><Input value={name} onChange={(e) => { setName(e.target.value); if (!editing) setSlug(slugify(e.target.value)); }} /></Field>
        <Field label="Slug"><Input value={slug} onChange={(e) => setSlug(e.target.value)} /></Field>
        <Field label="Deskripsi"><Textarea rows={3} value={description ?? ""} onChange={(e) => setDescription(e.target.value)} /></Field>
        <Field label="Image URL"><Input value={imageUrl ?? ""} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Price IDR"><Input type="number" value={priceIdr} onChange={(e) => setPriceIdr(e.target.value)} /></Field>
          <Field label="Price SOL"><Input type="number" step="0.0001" value={priceSol} onChange={(e) => setPriceSol(e.target.value)} /></Field>
          <Field label="Stock"><Input type="number" value={stock} onChange={(e) => setStock(e.target.value)} /></Field>
        </div>
        <Field label="Promo %"><Input type="number" value={promo} onChange={(e) => setPromo(e.target.value)} /></Field>
        <div className="flex items-center justify-between rounded-xl border p-3"><span className="text-sm">Bestseller</span><Switch checked={isBest} onCheckedChange={setIsBest} /></div>
        <div className="flex items-center justify-between rounded-xl border p-3"><span className="text-sm">Aktif</span><Switch checked={isActive} onCheckedChange={setIsActive} /></div>
      </div>
      <DialogFooter>
        <Button className="gradient-coffee text-cream" disabled={mSave.isPending || !name} onClick={() => mSave.mutate()}>
          {mSave.isPending ? "Menyimpan…" : editing ? "Update" : "Buat"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="text-xs">{label}</Label>{children}</div>;
}
