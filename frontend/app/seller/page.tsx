"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Spinner } from "@/components/UI";

interface DashboardStats {
  total_products: number;
  total_orders: number;
  revenue: number;
  pending_orders: number;
  low_stock_products: number;
  out_of_stock_products: number;
  total_units_sold: number;
  commission_rate: number;
  net_earnings: number;
}

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className={`rounded-xl2 p-5 shadow-card ${accent ? "bg-whisper-700 text-white" : "bg-white text-ink-900"}`}>
      <p className={`text-xs font-medium ${accent ? "text-whisper-100" : "text-ink-500"}`}>{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

export default function SellerDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    api.get<DashboardStats>("/api/sellers/me/dashboard").then(setStats).catch(() => {});
  }, []);

  if (!stats) return <div className="py-16 flex justify-center"><Spinner size={28} /></div>;

  return (
    <div>
      <h1 className="text-xl font-display font-bold text-ink-900 mb-4">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Sales (Gross)" value={`₹${stats.revenue.toLocaleString("en-IN")}`} accent />
        <StatCard label="Orders" value={stats.total_orders} />
        <StatCard label="Products" value={stats.total_products} />
        <StatCard label="Pending Orders" value={stats.pending_orders} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Units Sold" value={stats.total_units_sold} />
        <StatCard label="Low Stock Items" value={stats.low_stock_products} />
        <StatCard label="Out of Stock" value={stats.out_of_stock_products} />
        <StatCard label={`Net Earnings (after ${stats.commission_rate}% commission)`} value={`₹${stats.net_earnings.toLocaleString("en-IN")}`} />
      </div>
    </div>
  );
}
