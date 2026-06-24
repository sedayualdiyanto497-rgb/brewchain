import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";
import { toast } from "sonner";
import { SIGN_IN_MESSAGE } from "@/lib/solana/config";
import { verifyWalletSignIn } from "@/lib/brewchain/profile.functions";
import { WALLET_TOKEN_STORAGE } from "@/lib/brewchain/wallet-auth";

type Session = {
  walletAddress: string;
  signedAt: number;
};

type WalletAuthCtx = {
  session: Session | null;
  isAuthenticated: boolean;
  isSigningIn: boolean;
  signIn: () => Promise<void>;
  signOut: () => void;
};

const Ctx = createContext<WalletAuthCtx | null>(null);
const STORAGE_KEY = "brewchain.session";

export function WalletAuthProvider({ children }: { children: ReactNode }) {
  const { publicKey, signMessage, connected, disconnect } = useWallet();
  const [session, setSession] = useState<Session | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Hydrate session from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const s = JSON.parse(raw) as Session;
      setSession(s);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // If wallet disconnects, drop session
  useEffect(() => {
    if (!connected && session) {
      setSession(null);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(STORAGE_KEY);
        window.localStorage.removeItem(WALLET_TOKEN_STORAGE);
      }
    }
  }, [connected, session]);

  // If wallet switched, clear session for safety
  useEffect(() => {
    if (publicKey && session && publicKey.toBase58() !== session.walletAddress) {
      setSession(null);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(STORAGE_KEY);
        window.localStorage.removeItem(WALLET_TOKEN_STORAGE);
      }
    }
  }, [publicKey, session]);

  const signIn = useCallback(async () => {
    if (!publicKey || !signMessage) {
      toast.error("Wallet belum terhubung");
      return;
    }
    setIsSigningIn(true);
    try {
      const nonce = crypto.randomUUID();
      const message = SIGN_IN_MESSAGE(nonce);
      const encoded = new TextEncoder().encode(message);
      const signature = await signMessage(encoded);
      const signatureB58 = bs58.encode(signature);

      const res = await verifyWalletSignIn({
        data: {
          walletAddress: publicKey.toBase58(),
          message,
          signatureB58,
        },
      });
      if (typeof window !== "undefined" && res?.token) {
        window.localStorage.setItem(WALLET_TOKEN_STORAGE, res.token);
      }

      const next: Session = { walletAddress: publicKey.toBase58(), signedAt: Date.now() };
      setSession(next);
      if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      toast.success("Login berhasil", { description: "Wallet terverifikasi 🔐" });
    } catch (e) {
      console.error(e);
      toast.error("Gagal menandatangani pesan", { description: (e as Error)?.message });
    } finally {
      setIsSigningIn(false);
    }
  }, [publicKey, signMessage]);

  const signOut = useCallback(() => {
    setSession(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(WALLET_TOKEN_STORAGE);
    }
    void disconnect();
    toast("Berhasil logout");
  }, [disconnect]);

  const value = useMemo<WalletAuthCtx>(
    () => ({
      session,
      isAuthenticated: !!session && connected,
      isSigningIn,
      signIn,
      signOut,
    }),
    [session, connected, isSigningIn, signIn, signOut],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWalletAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWalletAuth must be used within WalletAuthProvider");
  return ctx;
}