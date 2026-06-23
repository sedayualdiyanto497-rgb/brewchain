import { Link } from "@tanstack/react-router";
import { Coffee, ShoppingBag, LayoutDashboard, Shield } from "lucide-react";
import { ConnectWalletButton } from "@/components/brewchain/ConnectWalletButton";
import { ClientOnly } from "@/components/brewchain/ClientOnly";
import { useCart } from "@/lib/brewchain/cart-store";
import { Badge } from "@/components/ui/badge";
import type { ReactNode } from "react";

function CartBadge() {
  const items = useCart();
  const count = items.reduce((s, i) => s + i.quantity, 0);
  return (
    <Link to="/cart" className="relative flex size-10 items-center justify-center rounded-full bg-secondary hover:bg-secondary/70 transition">
      <ShoppingBag className="size-4" />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full gradient-solana px-1 text-[10px] font-bold text-white">
          {count}
        </span>
      )}
    </Link>
  );
}

export function TopNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 glass-strong">
      <div className="container mx-auto flex h-16 items-center gap-6 px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid size-9 place-items-center rounded-xl gradient-coffee shadow-soft">
            <Coffee className="size-5 text-cream" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-lg font-bold tracking-tight">BrewChain</span>
            <Badge variant="secondary" className="rounded-full px-2 py-0 text-[9px] uppercase tracking-widest">Devnet</Badge>
          </div>
        </Link>

        <nav className="ml-2 hidden items-center gap-1 text-sm md:flex">
          <Link to="/menu" className="rounded-full px-3 py-1.5 hover:bg-secondary/60 transition" activeProps={{ className: "bg-secondary text-foreground" }}>Menu</Link>
          <Link to="/dashboard" className="rounded-full px-3 py-1.5 hover:bg-secondary/60 transition" activeProps={{ className: "bg-secondary" }}>Dashboard</Link>
          <Link to="/history" className="rounded-full px-3 py-1.5 hover:bg-secondary/60 transition" activeProps={{ className: "bg-secondary" }}>Riwayat</Link>
          <Link to="/blockchain" className="rounded-full px-3 py-1.5 hover:bg-secondary/60 transition" activeProps={{ className: "bg-secondary" }}>Blockchain</Link>
          <Link to="/admin" className="rounded-full px-3 py-1.5 text-muted-foreground hover:bg-secondary/60 transition flex items-center gap-1.5">
            <Shield className="size-3.5" /> Admin
          </Link>
          <Link to="/kasir" className="rounded-full px-3 py-1.5 text-muted-foreground hover:bg-secondary/60 transition flex items-center gap-1.5">
            <LayoutDashboard className="size-3.5" /> Kasir
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ClientOnly>
            <CartBadge />
          </ClientOnly>
          <ClientOnly fallback={<div className="h-10 w-36 rounded-full bg-secondary/60" />}>
            <ConnectWalletButton />
          </ClientOnly>
        </div>
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopNav />
      <main>{children}</main>
      <Footer />
    </div>
  );
}

export function Footer() {
  return (
    <footer className="mt-32 border-t border-border/60 bg-secondary/30">
      <div className="container mx-auto grid gap-10 px-4 py-14 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="grid size-9 place-items-center rounded-xl gradient-coffee">
              <Coffee className="size-5 text-cream" />
            </div>
            <span className="font-display text-lg font-bold">BrewChain</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Kedai kopi premium dengan pembayaran on-chain di Solana — transparan, instan, dan bebas perantara.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Aplikasi</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/menu" className="hover:text-foreground">Menu</Link></li>
            <li><Link to="/dashboard" className="hover:text-foreground">Dashboard</Link></li>
            <li><Link to="/history" className="hover:text-foreground">Riwayat</Link></li>
            <li><Link to="/profile" className="hover:text-foreground">Profile</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Web3</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/blockchain" className="hover:text-foreground">Blockchain Explorer</Link></li>
            <li><a href="https://explorer.solana.com/?cluster=devnet" target="_blank" rel="noreferrer" className="hover:text-foreground">Solana Explorer</a></li>
            <li><a href="https://phantom.app" target="_blank" rel="noreferrer" className="hover:text-foreground">Phantom</a></li>
            <li><a href="https://solflare.com" target="_blank" rel="noreferrer" className="hover:text-foreground">Solflare</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Operasional</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/admin" className="hover:text-foreground">Admin Dashboard</Link></li>
            <li><Link to="/kasir" className="hover:text-foreground">Kasir</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60">
        <div className="container mx-auto flex flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground md:flex-row">
          <span>© {new Date().getFullYear()} BrewChain · Built on Solana Devnet</span>
          <span>Crafted with ☕ and ⛓</span>
        </div>
      </div>
    </footer>
  );
}