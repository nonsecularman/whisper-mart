"use client";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { Spinner } from "@/components/UI";
import type { Seller, SellerStatus } from "@/types";

const STATUS_COLOR: Record<SellerStatus, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-rose-100 text-rose-700",
  SUSPENDED: "bg-gray-200 text-gray-600",
};

export default function AdminSellersPage() {
  const { showToast } = useToast();
  const [sellers, setSellers] = useState<Seller[] | null>(null);

  function load() {
    api.get<Seller[]>("/api/sellers/admin/all").then(setSellers).catch(() => setSellers([]));
  }
  useEffect(load, []);

  async function updateStatus(id: string, status: SellerStatus) {
    try {
      await api.put(`/api/sellers/admin/${id}/status`, { status });
      showToast(`Seller marked as ${status}`, "success");
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not update seller", "error");
    }
  }

  if (sellers === null) return <div className="py-16 flex justify-center"><Spinner size={28} /></div>;

  return (
    <div>
      <h1 className="text-xl font-display font-bold text-ink-900 mb-4">Sellers</h1>
      <div className="space-y-3">
        {sellers.map((s) => (
          <div key={s.id} className="bg-white rounded-xl2 shadow-card p-4 flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <p className="font-semibold text-sm text-ink-900">{s.store_name}</p>
              <p className="text-xs text-ink-500">{s.owner_name} · {s.email} · {s.phone}</p>
            </div>
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_COLOR[s.status]}`}>{s.status}</span>
            <div className="flex gap-2">
              {s.status !== "APPROVED" && (
                <button onClick={() => updateStatus(s.id, "APPROVED")} className="text-xs font-semibold bg-emerald-600 text-white px-3 py-1.5 rounded-full">Approve</button>
              )}
              {s.status !== "REJECTED" && (
                <button onClick={() => updateStatus(s.id, "REJECTED")} className="text-xs font-semibold bg-rose-600 text-white px-3 py-1.5 rounded-full">Reject</button>
              )}
              {s.status === "APPROVED" && (
                <button onClick={() => updateStatus(s.id, "SUSPENDED")} className="text-xs font-semibold border border-gray-300 px-3 py-1.5 rounded-full">Suspend</button>
              )}
            </div>
          </div>
        ))}
        {sellers.length === 0 && <p className="text-sm text-ink-500">No sellers yet.</p>}
      </div>
    </div>
  );
}
