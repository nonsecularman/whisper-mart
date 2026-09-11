"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Spinner } from "@/components/UI";

interface Stats {
  total_users: number;
  total_sellers: number;
  total_products: number;
  total_orders: number;
  total_revenue: number;
  pending_seller_approvals: number;
  pending_product_approvals: number;
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl2 shadow-card p-5">
      <p className="text-xs text-ink-500 font-medium">{label}</p>
      <p className="text-2xl font-bold text-ink-900 mt-1">{value}</p>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [salesOverTime, setSalesOverTime] = useState<any[]>([]);
  const [topCategories, setTopCategories] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);

  useEffect(() => {
    api.get<Stats>("/api/admin/stats").then(setStats).catch(() => {});
    api.get<any[]>("/api/admin/stats/sales-over-time").then(setSalesOverTime).catch(() => {});
    api.get<any[]>("/api/admin/stats/top-categories").then(setTopCategories).catch(() => {});
    api.get<any[]>("/api/admin/stats/top-products").then(setTopProducts).catch(() => {});
  }, []);

  if (!stats) return <div className="py-16 flex justify-center"><Spinner size={28} /></div>;

  const maxRevenue = Math.max(1, ...salesOverTime.map((s) => s.revenue));

  return (
    <div>
      <h1 className="text-xl font-display font-bold text-ink-900 mb-4">Platform Overview</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Users" value={stats.total_users} />
        <StatCard label="Total Sellers" value={stats.total_sellers} />
        <StatCard label="Total Products" value={stats.total_products} />
        <StatCard label="Total Orders" value={stats.total_orders} />
        <StatCard label="Total Revenue" value={`₹${stats.total_revenue.toLocaleString("en-IN")}`} />
        <StatCard label="Pending Approvals" value={stats.pending_seller_approvals + stats.pending_product_approvals} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl2 shadow-card p-5">
          <h3 className="font-semibold text-sm text-ink-900 mb-3">Sales Over Time</h3>
          {salesOverTime.length === 0 ? (
            <p className="text-xs text-ink-500">No sales data yet.</p>
          ) : (
            <div className="flex items-end gap-1 h-32">
              {salesOverTime.slice(-14).map((s, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full" title={`${s.date}: ₹${s.revenue}`}>
                  <div className="w-full bg-whisper-600 rounded-t" style={{ height: `${(s.revenue / maxRevenue) * 100}%`, minHeight: 2 }} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl2 shadow-card p-5">
          <h3 className="font-semibold text-sm text-ink-900 mb-3">Top Categories</h3>
          <div className="space-y-2">
            {topCategories.map((c) => (
              <div key={c.category} className="flex justify-between text-sm">
                <span className="text-ink-700">{c.category}</span>
                <span className="text-ink-500">{c.units_sold} sold</span>
              </div>
            ))}
            {topCategories.length === 0 && <p className="text-xs text-ink-500">No data yet.</p>}
          </div>
        </div>

        <div className="bg-white rounded-xl2 shadow-card p-5 md:col-span-2">
          <h3 className="font-semibold text-sm text-ink-900 mb-3">Top Products</h3>
          <div className="space-y-2">
            {topProducts.map((p) => (
              <div key={p.id} className="flex justify-between text-sm">
                <span className="text-ink-700">{p.name}</span>
                <span className="text-ink-500">{p.sold_count} sold · ₹{p.revenue.toLocaleString("en-IN")}</span>
              </div>
            ))}
            {topProducts.length === 0 && <p className="text-xs text-ink-500">No data yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
