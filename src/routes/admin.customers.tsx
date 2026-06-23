import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClientOnly } from "@/components/brewchain/ClientOnly";
import { formatIDR, shortAddr } from "@/lib/brewchain/format";

const listCustomers = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("profiles").select("*").order("total_spent_idr", { ascending: false }).limit(50);
  return data ?? [];
});

export const Route = createFileRoute("/admin/customers")({
  component: () => <ClientOnly><AdminCustomers /></ClientOnly>,
});

function AdminCustomers() {
  const { data } = useQuery({ queryKey: ["customers"], queryFn: () => listCustomers() });
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Wallet</th>
                <th className="px-4 py-3">Nickname</th>
                <th className="px-4 py-3">Membership</th>
                <th className="px-4 py-3 text-right">Orders</th>
                <th className="px-4 py-3 text-right">Spent</th>
                <th className="px-4 py-3 text-right">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(data ?? []).map((c) => (
                <tr key={c.wallet_address}>
                  <td className="px-4 py-3 font-mono text-xs">{shortAddr(c.wallet_address, 6, 6)}</td>
                  <td className="px-4 py-3">{c.nickname ?? <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-4 py-3"><Badge variant="secondary" className="rounded-full">{c.membership_level}</Badge></td>
                  <td className="px-4 py-3 text-right">{c.total_orders}</td>
                  <td className="px-4 py-3 text-right">{formatIDR(c.total_spent_idr)}</td>
                  <td className="px-4 py-3 text-right">{c.total_points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}