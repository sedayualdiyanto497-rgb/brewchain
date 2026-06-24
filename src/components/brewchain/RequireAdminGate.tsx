import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { useWalletAuth } from "@/contexts/WalletAuthProvider";
import { getMyRole } from "@/lib/brewchain/profile.functions";
import { Button } from "@/components/ui/button";

export function RequireAdminGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useWalletAuth();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["my-role"],
    queryFn: () => getMyRole(),
    enabled: isAuthenticated,
    retry: false,
  });

  if (!isAuthenticated) return <GateMessage title="Login wallet diperlukan" body="Hubungkan & sign wallet untuk membuka area admin." />;
  if (isLoading) return <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">Memeriksa akses…</div>;
  if (isError || !data?.isStaff) {
    return <GateMessage title="Akses ditolak" body="Wallet ini tidak memiliki izin admin/kasir." />;
  }
  return <>{children}</>;
}

function GateMessage({ title, body }: { title: string; body: string }) {
  return (
    <div className="container mx-auto max-w-md px-4 py-24 text-center">
      <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
        <ShieldAlert className="size-7" />
      </div>
      <h1 className="mt-4 font-display text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-muted-foreground">{body}</p>
      <Button asChild className="mt-6 rounded-full"><Link to="/">Kembali ke beranda</Link></Button>
    </div>
  );
}