"use client";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { Spinner } from "@/components/UI";

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  stock: number;
  status: string;
  price: number;
  is_low_stock: boolean;
  is_out_of_stock: boolean;
}

export default function SellerInventoryPage() {
  const { showToast } = useToast();
  const [items, setItems] = useState<InventoryItem[] | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});

  function load() {
    api.get<InventoryItem[]>("/api/sellers/me/inventory").then(setItems).catch(() => setItems([]));
  }
  useEffect(load, []);

  async function saveStock(id: string) {
    const value = edits[id];
    if (value === undefined) return;
    try {
      await api.put(`/api/sellers/me/inventory/${id}?stock=${encodeURIComponent(value)}`);
      showToast("Stock updated", "success");
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not update stock", "error");
    }
  }

  if (items === null) return <div className="py-16 flex justify-center"><Spinner size={28} /></div>;

  const lowStock = items.filter((i) => i.is_low_stock);
  const outOfStock = items.filter((i) => i.is_out_of_stock);

  return (
    <div>
      <h1 className="text-xl font-display font-bold text-ink-900 mb-4">Inventory</h1>

      {(lowStock.length > 0 || outOfStock.length > 0) && (
        <div className="mb-4 space-y-2">
          {outOfStock.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-4 py-2">
              {outOfStock.length} product(s) are out of stock.
            </div>
          )}
          {lowStock.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-lg px-4 py-2">
              {lowStock.length} product(s) are running low (5 or fewer units left).
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl2 shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-whisper-50 text-ink-600 text-xs uppercase">
            <tr>
              <th className="text-left p-3">Product</th>
              <th className="text-left p-3">SKU</th>
              <th className="text-left p-3">Price</th>
              <th className="text-left p-3">Stock</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Update</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="p-3">{item.name}</td>
                <td className="p-3 text-ink-500">{item.sku}</td>
                <td className="p-3">₹{item.price.toLocaleString("en-IN")}</td>
                <td className="p-3">
                  <span className={item.is_out_of_stock ? "text-rose-600 font-semibold" : item.is_low_stock ? "text-amber-600 font-semibold" : ""}>
                    {item.stock}
                  </span>
                </td>
                <td className="p-3 text-xs">{item.status}</td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={0}
                      placeholder={String(item.stock)}
                      onChange={(e) => setEdits((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      className="w-20 border rounded-lg px-2 py-1 text-sm"
                    />
                    <button onClick={() => saveStock(item.id)} className="text-xs font-semibold text-whisper-700">Save</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
