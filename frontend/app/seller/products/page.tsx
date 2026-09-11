"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { Spinner, EmptyState } from "@/components/UI";
import type { ProductCard } from "@/types";

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  PENDING_APPROVAL: "bg-amber-100 text-amber-700",
  REJECTED: "bg-rose-100 text-rose-700",
  OUT_OF_STOCK: "bg-gray-200 text-gray-600",
  DRAFT: "bg-gray-100 text-gray-500",
};

export default function SellerProductsPage() {
  const { showToast } = useToast();
  const [products, setProducts] = useState<ProductCard[] | null>(null);

  function load() {
    api.get<ProductCard[]>("/api/products/seller/mine").then(setProducts).catch(() => setProducts([]));
  }
  useEffect(load, []);

  async function deleteProduct(id: string) {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    try {
      await api.del(`/api/products/${id}`);
      showToast("Product deleted", "success");
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not delete product", "error");
    }
  }

  if (products === null) return <div className="py-16 flex justify-center"><Spinner size={28} /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-display font-bold text-ink-900">My Products</h1>
        <Link href="/seller/products/new" className="bg-whisper-700 text-white text-sm font-semibold px-4 py-2 rounded-full">+ Add Product</Link>
      </div>

      {products.length === 0 ? (
        <EmptyState title="No products yet" subtitle="Add your first product to start selling." />
      ) : (
        <div className="bg-white rounded-xl2 shadow-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-whisper-50 text-ink-600 text-xs uppercase">
              <tr>
                <th className="text-left p-3">Product</th>
                <th className="text-left p-3">Price</th>
                <th className="text-left p-3">Stock</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="p-3 flex items-center gap-3">
                    <div className="relative w-10 h-10 bg-whisper-50 rounded-lg overflow-hidden shrink-0">
                      {p.image && <Image src={p.image} alt={p.name} fill className="object-cover" />}
                    </div>
                    <span className="line-clamp-1 max-w-xs">{p.name}</span>
                  </td>
                  <td className="p-3">₹{p.price.toLocaleString("en-IN")}</td>
                  <td className="p-3">{p.stock}</td>
                  <td className="p-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_COLOR[p.status] || ""}`}>{p.status}</span>
                  </td>
                  <td className="p-3">
                    <Link href={`/seller/products/${p.id}/edit`} className="text-whisper-700 font-semibold mr-3">Edit</Link>
                    <button onClick={() => deleteProduct(p.id)} className="text-rose-600 font-semibold">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
