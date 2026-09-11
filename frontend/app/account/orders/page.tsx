"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { EmptyState, Spinner } from "@/components/UI";
import type { Order, OrderStatus } from "@/types";

const STATUS_FLOW: OrderStatus[] = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"];

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Order Placed",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  RETURN_REQUESTED: "Return Requested",
  RETURNED: "Returned",
};

function StatusBadge({ status }: { status: OrderStatus }) {
  const color =
    status === "DELIVERED" ? "bg-emerald-100 text-emerald-700" :
    status === "CANCELLED" || status === "RETURNED" ? "bg-rose-100 text-rose-700" :
    status === "RETURN_REQUESTED" ? "bg-amber-100 text-amber-700" :
    "bg-whisper-100 text-whisper-700";
  return <span className={`text-xs font-semibold px-2 py-1 rounded-full ${color}`}>{STATUS_LABEL[status]}</span>;
}

function Timeline({ order }: { order: Order }) {
  if (order.status === "CANCELLED") {
    return <p className="text-sm text-rose-600 font-medium">This order was cancelled.</p>;
  }
  const currentIdx = STATUS_FLOW.indexOf(order.status);
  return (
    <div className="flex items-center overflow-x-auto py-2">
      {STATUS_FLOW.map((s, i) => (
        <div key={s} className="flex items-center shrink-0">
          <div className="flex flex-col items-center w-20">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${i <= currentIdx ? "bg-whisper-700 text-white" : "bg-gray-200 text-gray-400"}`}>
              {i <= currentIdx ? "✓" : i + 1}
            </div>
            <span className={`text-[10px] text-center mt-1 ${i <= currentIdx ? "text-ink-800" : "text-gray-400"}`}>{STATUS_LABEL[s]}</span>
          </div>
          {i < STATUS_FLOW.length - 1 && <div className={`w-8 h-0.5 ${i < currentIdx ? "bg-whisper-700" : "bg-gray-200"}`} />}
        </div>
      ))}
    </div>
  );
}

export default function OrdersPage() {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  function load() {
    api.get<Order[]>("/api/orders/my").then(setOrders).catch(() => setOrders([]));
  }
  useEffect(load, []);

  async function cancelOrder(id: string) {
    try {
      await api.post(`/api/orders/${id}/cancel`);
      showToast("Order cancelled", "success");
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not cancel order", "error");
    }
  }

  async function requestReturn(id: string) {
    try {
      await api.post(`/api/orders/${id}/return`);
      showToast("Return requested", "success");
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not request return", "error");
    }
  }

  if (orders === null) return <div className="py-16 flex justify-center"><Spinner size={28} /></div>;

  if (orders.length === 0) {
    return (
      <EmptyState
        title="No orders yet"
        subtitle="When you place an order, it will show up here."
        action={<Link href="/search" className="bg-whisper-700 text-white px-5 py-2 rounded-full font-semibold">Start Shopping</Link>}
      />
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-lg text-ink-900">My Orders</h2>
      {orders.map((order) => (
        <div key={order.id} className="bg-white rounded-xl2 shadow-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <p className="text-sm font-semibold text-ink-900">Order #{order.order_number}</p>
              <p className="text-xs text-ink-500">{new Date(order.created_at).toLocaleDateString()} · {order.payment_method}</p>
            </div>
            <StatusBadge status={order.status} />
          </div>

          <div className="space-y-2 mb-3">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-ink-700">{item.product_name_snapshot} × {item.quantity}</span>
                <span className="font-medium">₹{(item.price * item.quantity).toLocaleString("en-IN")}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-between text-sm font-bold border-t pt-2 mb-3">
            <span>Total</span><span>₹{order.total.toLocaleString("en-IN")}</span>
          </div>

          <button onClick={() => setExpanded(expanded === order.id ? null : order.id)} className="text-xs font-semibold text-whisper-700">
            {expanded === order.id ? "Hide tracking" : "Track order"}
          </button>

          {expanded === order.id && (
            <div className="mt-3 border-t pt-3">
              <Timeline order={order} />
              <div className="text-xs text-ink-500 mt-2">
                <p className="font-semibold text-ink-700 mb-1">Shipping Address</p>
                <p>{order.shipping_address_snapshot.full_name}, {order.shipping_address_snapshot.street}, {order.shipping_address_snapshot.city}, {order.shipping_address_snapshot.state} {order.shipping_address_snapshot.postal_code}</p>
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-3">
            {!["SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "RETURNED", "RETURN_REQUESTED"].includes(order.status) && (
              <button onClick={() => cancelOrder(order.id)} className="text-xs font-semibold text-rose-600">Cancel Order</button>
            )}
            {order.status === "DELIVERED" && (
              <button onClick={() => requestReturn(order.id)} className="text-xs font-semibold text-amber-600">Request Return</button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
