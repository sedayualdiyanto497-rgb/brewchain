import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, ChevronDown, LogOut, Shield, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWalletAuth } from "@/contexts/WalletAuthProvider";
import { shortAddr } from "@/lib/brewchain/format";
import { toast } from "sonner";

export function ConnectWalletButton({ size = "default" }: { size?: "sm" | "default" | "lg" }) {
  const { wallets, select, connect, connecting, publicKey, wallet } = useWallet();
  const { signIn, signOut, isAuthenticated, isSigningIn, session } = useWalletAuth();
  const [pickerOpen, setPickerOpen] = useState(false);

  // Connected + signed → show wallet menu
  if (publicKey && isAuthenticated) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size={size} className="gap-2 rounded-full border-primary/30">
            <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_currentColor]" />
            <span className="font-mono text-xs">{shortAddr(publicKey.toBase58())}</span>
            <ChevronDown className="size-3.5 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="text-xs uppercase tracking-wider opacity-70">
            {wallet?.adapter.name} · Devnet
          </DropdownMenuLabel>
          <DropdownMenuItem className="font-mono text-xs" onClick={() => {
            void navigator.clipboard.writeText(publicKey.toBase58());
            toast.success("Wallet address disalin");
          }}>
            {publicKey.toBase58()}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={signOut} className="gap-2 text-destructive focus:text-destructive">
            <LogOut className="size-4" /> Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Connected but not signed → ask to sign
  if (publicKey && !isAuthenticated) {
    return (
      <Button onClick={signIn} disabled={isSigningIn} size={size} className="gap-2 gradient-solana text-white shadow-glow-sol">
        <Shield className="size-4" />
        {isSigningIn ? "Signing…" : "Sign Message to Login"}
      </Button>
    );
  }

  return (
    <DropdownMenu open={pickerOpen} onOpenChange={setPickerOpen}>
      <DropdownMenuTrigger asChild>
        <Button size={size} className="gap-2 gradient-solana text-white shadow-glow-sol">
          <Wallet className="size-4" />
          {connecting ? "Connecting…" : "Connect Wallet"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 p-2">
        <DropdownMenuLabel className="text-xs uppercase tracking-wider opacity-70">Choose wallet</DropdownMenuLabel>
        <AnimatePresence>
          {wallets.map((w) => (
            <motion.div key={w.adapter.name} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
              <DropdownMenuItem
                onClick={async () => {
                  select(w.adapter.name);
                  setPickerOpen(false);
                  try {
                    await new Promise((r) => setTimeout(r, 100));
                    await connect();
                  } catch (e) {
                    toast.error("Gagal menghubungkan wallet", { description: (e as Error)?.message });
                  }
                }}
                className="gap-3 py-2.5"
              >
                {w.adapter.icon ? (
                  <img src={w.adapter.icon} alt={w.adapter.name} className="size-6 rounded" />
                ) : (
                  <Wallet className="size-5" />
                )}
                <div className="flex-1">
                  <div className="text-sm font-medium">{w.adapter.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {w.readyState === "Installed" ? "Detected" : "Not installed"}
                  </div>
                </div>
                {w.readyState === "Installed" && <Check className="size-4 text-emerald-500" />}
              </DropdownMenuItem>
            </motion.div>
          ))}
        </AnimatePresence>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}