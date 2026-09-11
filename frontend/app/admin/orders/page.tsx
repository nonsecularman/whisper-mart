"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Spinner } from "@/components/UI";
import type { Order } from "@/types";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    api.get<Order[]>("/api/orders/admin/all").then(setOrders).catch(() => setOrders([]));
  }, []);

  if (orders === null) return <div className="py-16 flex justify-center"><Spinner size={28} /></div>;

  return (
    <div>
      <h1 className="text-xl font-display font-bold text-ink-900 mb-4">All Orders</h1>
      <div className="bg-white rounded-xl2 shadow-card overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-whisper-50 text-ink-600 text-xs uppercase">
            <tr>
              <th className="text-left p-3">Order #</th>
              <th className="text-left p-3">Items</th>
              <th className="text-left p-3">Total</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Payment</th>
              <th className="text-left p-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {orders.map((o) => (
              <tr key={o.id}>
                <td className="p-3 font-medium">{o.order_number}</td>
                <td className="p-3 text-ink-500">{o.items.length} item(s)</td>
                <td className="p-3">₹{o.total.toLocaleString("en-IN")}</td>
                <td className="p-3">
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-whisper-100 text-whisper-700">{o.status}</span>
                </td>
                <td className="p-3 text-ink-500">{o.payment_method}</td>
                <td className="p-3 text-ink-500">{new Date(o.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && <p className="p-4 text-sm text-ink-500">No orders yet.</p>}
      </div>
    </div>
  );
}
