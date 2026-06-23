import { useMemo, type ReactNode } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { BackpackWalletAdapter } from "@solana/wallet-adapter-backpack";
import { SOLANA_ENDPOINT, SOLANA_CLUSTER } from "@/lib/solana/config";
import { WalletAuthProvider } from "@/contexts/WalletAuthProvider";

export function SolanaProviders({ children }: { children: ReactNode }) {
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter({ network: SOLANA_CLUSTER as never }),
      new BackpackWalletAdapter(),
    ],
    [],
  );

  return (
    <ConnectionProvider endpoint={SOLANA_ENDPOINT}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletAuthProvider>{children}</WalletAuthProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}