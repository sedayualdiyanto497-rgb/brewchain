import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ClientOnly } from "@/components/brewchain/ClientOnly";
import { adminListVouchers, createVoucher, deleteVoucher, updateVoucher } from "@/lib/brewchain/admin.functions";
import { formatIDR } from "@/lib/brewchain/format";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/vouchers")({
  component: () => <ClientOnly><AdminVouchers /></ClientOnly>,
});

type Row = Awaited<ReturnType<typeof adminListVouchers>>[number];

function AdminVouchers() {
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery({ queryKey: ["admin-vouchers"], queryFn: () => adminListVouchers() });
  const [editing, setEditing] = useState<Row | null>(null);
  const [open, setOpen] = useState(false);

  const mDelete = useMutation({
    mutationFn: (id: string) => deleteVoucher({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-vouchers"] }); toast.success("Voucher dihapus"); },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold">Kelola Voucher</h2>
          <p className="text-xs text-muted-foreground">Kode promo & diskon untuk customer.</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button className="gradient-coffee text-cream gap-1" onClick={() => { setEditing(null); setOpen(true); }}>
              <Plus className="size-4" /> Voucher Baru
            </Button>
          </DialogTrigger>
          <VoucherFormDialog editing={editing} onDone={() => { setOpen(false); setEditing(null); qc.invalidateQueries({ queryKey: ["admin-vouchers"] }); }} />
        </Dialog>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((v) => (
          <Card key={v.id} className="rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-mono text-lg font-bold tracking-wider">{v.code}</div>
                  <div className="text-xs text-muted-foreground">{v.description}</div>
                </div>
                <Badge className="rounded-full gradient-solana text-white border-0">{v.discount_pct}%</Badge>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>Min order: <span className="font-semibold text-foreground">{formatIDR(v.min_order_idr)}</span></div>
                <div>Pakai: <span className="font-semibold text-foreground">{v.used_count}/{v.max_uses}</span></div>
                <div className="col-span-2">Expires: {v.expires_at ? new Date(v.expires_at).toLocaleDateString("id-ID") : "—"}</div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                {v.is_active ? <Badge variant="outline" className="rounded-full bg-emerald-500/10 text-emerald-700">Aktif</Badge> : <Badge variant="outline" className="rounded-full">Nonaktif</Badge>}
                <div>
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(v); setOpen(true); }}><Pencil className="size-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => mDelete.mutate(v.id)}><Trash2 className="size-4 text-rose-500" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {rows.length === 0 && <p className="text-sm text-muted-foreground">Belum ada voucher.</p>}
      </div>
    </div>
  );
}

function VoucherFormDialog({ editing, onDone }: { editing: Row | null; onDone: () => void }) {
  const [code, setCode] = useState(editing?.code ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [discount, setDiscount] = useState(String(editing?.discount_pct ?? 10));
  const [minOrder, setMinOrder] = useState(String(editing?.min_order_idr ?? 0));
  const [maxUses, setMaxUses] = useState(String(editing?.max_uses ?? 100));
  const [expires, setExpires] = useState(editing?.expires_at ? editing.expires_at.slice(0, 10) : "");
  const [isActive, setIsActive] = useState(editing?.is_active ?? true);

  const mSave = useMutation({
    mutationFn: async () => {
      const payload = {
        code: code.toUpperCase(),
        description: description || null,
        discount_pct: Number(discount),
        min_order_idr: Number(minOrder),
        max_uses: Number(maxUses),
        expires_at: expires ? new Date(expires).toISOString() : null,
        is_active: isActive,
      };
      if (editing) return updateVoucher({ data: { id: editing.id, ...payload } });
      return createVoucher({ data: payload });
    },
    onSuccess: () => { toast.success(editing ? "Voucher diperbarui" : "Voucher dibuat"); onDone(); },
    onError: (e) => toast.error("Gagal", { description: (e as Error).message }),
  });

  return (
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>{editing ? "Edit Voucher" : "Voucher Baru"}</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <Field label="Code"><Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="BREW20" /></Field>
        <Field label="Deskripsi"><Textarea rows={2} value={description ?? ""} onChange={(e) => setDescription(e.target.value)} /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Discount %"><Input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} /></Field>
          <Field label="Min Order"><Input type="number" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} /></Field>
          <Field label="Max Uses"><Input type="number" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} /></Field>
        </div>
        <Field label="Berlaku Sampai"><Input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} /></Field>
        <div className="flex items-center justify-between rounded-xl border p-3"><span className="text-sm">Aktif</span><Switch checked={isActive} onCheckedChange={setIsActive} /></div>
      </div>
      <DialogFooter>
        <Button className="gradient-coffee text-cream" disabled={mSave.isPending || !code} onClick={() => mSave.mutate()}>
          {mSave.isPending ? "Menyimpan…" : editing ? "Update" : "Buat"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="text-xs">{label}</Label>{children}</div>;
}
