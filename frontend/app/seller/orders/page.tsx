"use client";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { Spinner, EmptyState } from "@/components/UI";

interface SellerOrderItem {
  order_item_id: string;
  order_id: string;
  order_number: string;
  product_name: string;
  product_image?: string;
  quantity: number;
  price: number;
  item_status: string;
  order_status: string;
  shipping_address: any;
  created_at: string;
}

const NEXT_STATUS: Record<string, string | null> = {
  PENDING: "CONFIRMED",
  CONFIRMED: "PROCESSING",
  PROCESSING: "SHIPPED",
  SHIPPED: "OUT_FOR_DELIVERY",
  OUT_FOR_DELIVERY: "DELIVERED",
  DELIVERED: null,
  CANCELLED: null,
};

export default function SellerOrdersPage() {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<SellerOrderItem[] | null>(null);

  function load() {
    api.get<SellerOrderItem[]>("/api/orders/seller/mine").then(setOrders).catch(() => setOrders([]));
  }
  useEffect(load, []);

  async function advanceStatus(itemId: string, status: string) {
    try {
      await api.put(`/api/orders/seller/item/${itemId}/status`, { status });
      showToast(`Marked as ${status.replace(/_/g, " ")}`, "success");
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not update status", "error");
    }
  }

  async function cancelItem(itemId: string) {
    try {
      await api.put(`/api/orders/seller/item/${itemId}/status`, { status: "CANCELLED" });
      showToast("Order item cancelled", "success");
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not cancel item", "error");
    }
  }

  if (orders === null) return <div className="py-16 flex justify-center"><Spinner size={28} /></div>;

  return (
    <div>
      <h1 className="text-xl font-display font-bold text-ink-900 mb-4">Orders</h1>
      {orders.length === 0 ? (
        <EmptyState title="No orders yet" subtitle="Orders containing your products will appear here." />
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const next = NEXT_STATUS[o.item_status];
            return (
              <div key={o.order_item_id} className="bg-white rounded-xl2 shadow-card p-4 flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[200px]">
                  <p className="text-sm font-semibold text-ink-900">{o.product_name} × {o.quantity}</p>
                  <p className="text-xs text-ink-500">Order #{o.order_number} · {new Date(o.created_at).toLocaleDateString()}</p>
                  <p className="text-xs text-ink-500">Ship to: {o.shipping_address.city}, {o.shipping_address.state}</p>
                </div>
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-whisper-100 text-whisper-700">{o.item_status.replace(/_/g, " ")}</span>
                <div className="flex gap-2">
                  {next && (
                    <button onClick={() => advanceStatus(o.order_item_id, next)} className="text-xs font-semibold bg-whisper-700 text-white px-3 py-1.5 rounded-full">
                      Mark {next.replace(/_/g, " ")}
                    </button>
                  )}
                  {["PENDING", "CONFIRMED", "PROCESSING"].includes(o.item_status) && (
                    <button onClick={() => cancelItem(o.order_item_id)} className="text-xs font-semibold text-rose-600">Cancel</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
