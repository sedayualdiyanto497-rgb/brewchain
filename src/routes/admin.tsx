import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Shield, BarChart3, Coffee, Users, Tag, Activity, ShoppingBag } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { ClientOnly } from "@/components/brewchain/ClientOnly";
import { RequireAdminGate } from "@/components/brewchain/RequireAdminGate";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — BrewChain" }] }),
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <AppShell>
      <ClientOnly>
        <RequireAdminGate>
      <div className="container mx-auto px-4 py-10">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl gradient-coffee text-cream"><Shield className="size-5" /></div>
          <div>
            <h1 className="font-display text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-xs text-muted-foreground">Kontrol kafe, produk, customer, voucher, dan analytics.</p>
          </div>
          <Badge className="ml-auto rounded-full gradient-solana text-white border-0">Restricted</Badge>
        </div>

        <nav className="mt-6 flex flex-wrap gap-2 rounded-2xl bg-secondary/40 p-1.5">
          <AdminTab to="/admin" icon={Activity}>Overview</AdminTab>
          <AdminTab to="/admin/orders" icon={ShoppingBag}>Orders</AdminTab>
          <AdminTab to="/admin/analytics" icon={BarChart3}>Analytics</AdminTab>
          <AdminTab to="/admin/products" icon={Coffee}>Produk</AdminTab>
          <AdminTab to="/admin/customers" icon={Users}>Customer</AdminTab>
          <AdminTab to="/admin/vouchers" icon={Tag}>Voucher</AdminTab>
        </nav>

        <div className="mt-6"><Outlet /></div>
      </div>
        </RequireAdminGate>
      </ClientOnly>
    </AppShell>
  );
}

function AdminTab({ to, icon: Icon, children }: { to: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <Link to={to} activeOptions={{ exact: true }} activeProps={{ className: "bg-card shadow-soft" }}
      className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition hover:bg-card/70">
      <Icon className="size-4" /> {children}
    </Link>
  );
}