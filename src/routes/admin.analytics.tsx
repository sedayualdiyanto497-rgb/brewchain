import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { ClientOnly } from "@/components/brewchain/ClientOnly";
import { adminStats } from "@/lib/brewchain/orders.functions";

export const Route = createFileRoute("/admin/analytics")({
  component: () => <ClientOnly><Analytics /></ClientOnly>,
});

const COLORS = ["#9945FF", "#14F195", "#6F4E37", "#C4A484", "#3B82F6"];

function Analytics() {
  const { data } = useQuery({ queryKey: ["admin-stats"], queryFn: () => adminStats() });
  const orders = data?.orders ?? [];

  const dailyRevenue = useMemo(() => {
    const map = new Map<string, number>();
    orders.forEach((o) => {
      const key = new Date(o.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
      map.set(key, (map.get(key) ?? 0) + (o.status !== "cancelled" ? o.total_idr : 0));
    });
    return Array.from(map.entries()).slice(-14).map(([day, revenue]) => ({ day, revenue }));
  }, [orders]);

  const statusBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    orders.forEach((o) => map.set(o.status, (map.get(o.status) ?? 0) + 1));
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [orders]);

  const paymentBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    orders.forEach((o) => map.set(o.payment_method, (map.get(o.payment_method) ?? 0) + 1));
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [orders]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="rounded-2xl"><CardContent className="p-5">
        <h3 className="font-display text-lg font-semibold">Revenue 14 hari</h3>
        <div className="mt-4 h-72">
          <ResponsiveContainer>
            <BarChart data={dailyRevenue}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => new Intl.NumberFormat("id-ID").format(v)} />
              <Bar dataKey="revenue" fill="#9945FF" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent></Card>

      <Card className="rounded-2xl"><CardContent className="p-5">
        <h3 className="font-display text-lg font-semibold">Status Order</h3>
        <div className="mt-4 h-72">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={statusBreakdown} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={3}>
                {statusBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip /><Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent></Card>

      <Card className="rounded-2xl lg:col-span-2"><CardContent className="p-5">
        <h3 className="font-display text-lg font-semibold">Metode Pembayaran</h3>
        <div className="mt-4 h-64">
          <ResponsiveContainer>
            <BarChart data={paymentBreakdown} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
              <Tooltip />
              <Bar dataKey="value" fill="#14F195" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent></Card>
    </div>
  );
}