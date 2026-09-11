"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import type { Category } from "@/types";

interface SpecRow {
  spec_key: string;
  spec_value: string;
}

interface Props {
  mode: "create" | "edit";
  productId?: string;
  initial?: {
    name: string;
    description?: string;
    category_id: string;
    brand?: string;
    price: number;
    original_price: number;
    stock: number;
    sku: string;
    tags?: string;
    images: string[];
    specifications: SpecRow[];
  };
}

export default function ProductForm({ mode, productId, initial }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [categoryId, setCategoryId] = useState(initial?.category_id || "");
  const [brand, setBrand] = useState(initial?.brand || "");
  const [price, setPrice] = useState(initial?.price?.toString() || "");
  const [originalPrice, setOriginalPrice] = useState(initial?.original_price?.toString() || "");
  const [stock, setStock] = useState(initial?.stock?.toString() || "");
  const [sku, setSku] = useState(initial?.sku || "");
  const [tags, setTags] = useState(initial?.tags || "");
  const [images, setImages] = useState<string[]>(initial?.images || []);
  const [specs, setSpecs] = useState<SpecRow[]>(initial?.specifications?.length ? initial.specifications : [{ spec_key: "", spec_value: "" }]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get<Category[]>("/api/categories").then(setCategories).catch(() => {});
  }, []);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.upload<{ url: string }>("/api/products/seller/upload-image", formData);
      setImages((prev) => [...prev, res.url]);
      showToast("Image uploaded", "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Upload failed", "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function updateSpec(i: number, field: keyof SpecRow, value: string) {
    setSpecs((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (Number(originalPrice) < Number(price)) {
      showToast("Original price cannot be less than sale price", "error");
      return;
    }
    setBusy(true);
    const payload = {
      name, description, category_id: categoryId, brand,
      price: Number(price), original_price: Number(originalPrice), stock: Number(stock), sku, tags,
      images, specifications: specs.filter((s) => s.spec_key && s.spec_value),
    };
    try {
      if (mode === "create") {
        await api.post("/api/products", payload);
        showToast("Product submitted for approval", "success");
      } else {
        await api.put(`/api/products/${productId}`, payload);
        showToast("Product updated", "success");
      }
      router.push("/seller/products");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not save product", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="bg-white rounded-xl2 shadow-card p-6 space-y-5 max-w-2xl">
      <div>
        <label className="text-sm font-medium">Product Name</label>
        <input required value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
      </div>

      <div>
        <label className="text-sm font-medium">Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Category</label>
          <select required value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm">
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Brand</label>
          <input value={brand} onChange={(e) => setBrand(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium">Sale Price (₹)</label>
          <input required type="number" min={1} value={price} onChange={(e) => setPrice(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium">Original Price (₹)</label>
          <input required type="number" min={1} value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium">Stock</label>
          <input required type="number" min={0} value={stock} onChange={(e) => setStock(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">SKU</label>
          <input required disabled={mode === "edit"} value={sku} onChange={(e) => setSku(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-50" />
        </div>
        <div>
          <label className="text-sm font-medium">Tags (comma separated)</label>
          <input value={tags} onChange={(e) => setTags(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Images</label>
        <div className="flex gap-2 flex-wrap mt-2">
          {images.map((url, i) => (
            <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button type="button" onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))} className="absolute top-0 right-0 bg-black/60 text-white text-xs w-5 h-5">×</button>
            </div>
          ))}
          <label className="w-20 h-20 border-2 border-dashed rounded-lg flex items-center justify-center text-xs text-ink-500 cursor-pointer">
            {uploading ? "..." : "+ Add"}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
          </label>
        </div>
        <p className="text-xs text-ink-500 mt-1">First image will be used as the primary product image.</p>
      </div>

      <div>
        <label className="text-sm font-medium">Specifications</label>
        <div className="space-y-2 mt-2">
          {specs.map((s, i) => (
            <div key={i} className="flex gap-2">
              <input placeholder="Key (e.g. RAM)" value={s.spec_key} onChange={(e) => updateSpec(i, "spec_key", e.target.value)} className="flex-1 border rounded-lg px-3 py-2 text-sm" />
              <input placeholder="Value (e.g. 8GB)" value={s.spec_value} onChange={(e) => updateSpec(i, "spec_value", e.target.value)} className="flex-1 border rounded-lg px-3 py-2 text-sm" />
              <button type="button" onClick={() => setSpecs((prev) => prev.filter((_, idx) => idx !== i))} className="text-rose-600 text-sm px-2">×</button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setSpecs((prev) => [...prev, { spec_key: "", spec_value: "" }])} className="text-xs font-semibold text-whisper-700 mt-2">
          + Add specification
        </button>
      </div>

      <button disabled={busy} className="bg-whisper-700 hover:bg-whisper-800 text-white font-semibold px-6 py-2.5 rounded-full disabled:opacity-50">
        {busy ? "Saving..." : mode === "create" ? "Submit for Approval" : "Save Changes"}
      </button>
    </form>
  );
}
