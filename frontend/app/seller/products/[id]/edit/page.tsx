"use client";
import { useEffect, useState, use } from "react";
import { api } from "@/lib/api";
import ProductForm from "@/components/ProductForm";
import { Spinner } from "@/components/UI";

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    api.get(`/api/products/seller/mine/${id}`).then(setData).catch(() => setData(null));
  }, [id]);

  if (!data) return <div className="py-16 flex justify-center"><Spinner size={28} /></div>;

  return (
    <div>
      <h1 className="text-xl font-display font-bold text-ink-900 mb-4">Edit Product</h1>
      {data.status === "ACTIVE" && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
          Editing an active listing will send it back for admin re-approval before it's visible to shoppers again.
        </p>
      )}
      <ProductForm mode="edit" productId={id} initial={data} />
    </div>
  );
}
