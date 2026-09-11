"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { Spinner } from "@/components/UI";
import type { ProductCard } from "@/types";

export default function AdminProductsPage() {
  const { showToast } = useToast();
  const [pending, setPending] = useState<ProductCard[] | null>(null);

  function load() {
    api.get<ProductCard[]>("/api/products/admin/pending").then(setPending).catch(() => setPending([]));
  }
  useEffect(load, []);

  async function approve(id: string) {
    try {
      await api.post(`/api/products/admin/${id}/approve`);
      showToast("Product approved", "success");
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not approve product", "error");
    }
  }

  async function reject(id: string) {
    const reason = prompt("Reason for rejection:") || "Did not meet marketplace guidelines";
    try {
      await api.post(`/api/products/admin/${id}/reject?reason=${encodeURIComponent(reason)}`);
      showToast("Product rejected", "success");
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not reject product", "error");
    }
  }

  if (pending === null) return <div className="py-16 flex justify-center"><Spinner size={28} /></div>;

  return (
    <div>
      <h1 className="text-xl font-display font-bold text-ink-900 mb-4">Pending Product Approvals</h1>
      {pending.length === 0 ? (
        <p className="text-sm text-ink-500">No products pending approval.</p>
      ) : (
        <div className="space-y-3">
          {pending.map((p) => (
            <div key={p.id} className="bg-white rounded-xl2 shadow-card p-4 flex items-center gap-4">
              <div className="relative w-14 h-14 bg-whisper-50 rounded-lg overflow-hidden shrink-0">
                {p.image && <Image src={p.image} alt={p.name} fill className="object-cover" />}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm text-ink-900">{p.name}</p>
                <p className="text-xs text-ink-500">₹{p.price.toLocaleString("en-IN")} · Stock: {p.stock}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => approve(p.id)} className="text-xs font-semibold bg-emerald-600 text-white px-3 py-1.5 rounded-full">Approve</button>
                <button onClick={() => reject(p.id)} className="text-xs font-semibold bg-rose-600 text-white px-3 py-1.5 rounded-full">Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
