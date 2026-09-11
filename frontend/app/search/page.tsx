"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import type { PaginatedProducts, Category } from "@/types";
import ProductCard from "@/components/ProductCard";
import { ProductGridSkeleton, EmptyState } from "@/components/UI";

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "rating", label: "Customer Rating" },
  { value: "newest", label: "Newest First" },
];

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-6"><ProductGridSkeleton count={12} /></div>}>
      <SearchPageInner />
    </Suspense>
  );
}

function SearchPageInner() {
  const router = useRouter();
  const params = useSearchParams();

  const [result, setResult] = useState<PaginatedProducts | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const q = params.get("q") || "";
  const category = params.get("category") || "";
  const brand = params.get("brand") || "";
  const minPrice = params.get("min_price") || "";
  const maxPrice = params.get("max_price") || "";
  const minRating = params.get("min_rating") || "";
  const minDiscount = params.get("min_discount") || "";
  const inStock = params.get("in_stock") || "";
  const sort = params.get("sort") || "relevance";
  const page = parseInt(params.get("page") || "1", 10);
  const featured = params.get("featured") || "";

  useEffect(() => {
    api.get<Category[]>("/api/categories").then(setCategories).catch(() => {});
    api.get<string[]>("/api/products/brands").then(setBrands).catch(() => {});
  }, []);

  useEffect(() => {
    setResult(null);
    api
      .get<PaginatedProducts>("/api/products", {
        q: q || undefined,
        category: category || undefined,
        brand: brand || undefined,
        min_price: minPrice || undefined,
        max_price: maxPrice || undefined,
        min_rating: minRating || undefined,
        min_discount: minDiscount || undefined,
        in_stock: inStock || undefined,
        featured: featured || undefined,
        sort,
        page,
        page_size: 20,
      })
      .then(setResult)
      .catch(() => setResult({ items: [], total: 0, page: 1, page_size: 20, total_pages: 1 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, category, brand, minPrice, maxPrice, minRating, minDiscount, inStock, sort, page, featured]);

  const updateParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      next.delete("page");
      router.push(`/search?${next.toString()}`);
    },
    [params, router]
  );

  const goToPage = (p: number) => {
    const next = new URLSearchParams(params.toString());
    next.set("page", String(p));
    router.push(`/search?${next.toString()}`);
  };

  const FilterPanel = (
    <div className="space-y-6">
      <div>
        <h4 className="font-semibold text-sm text-ink-900 mb-2">Category</h4>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input type="radio" checked={!category} onChange={() => updateParam("category", "")} /> All
          </label>
          {categories.map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-sm text-ink-700">
              <input type="radio" checked={category === c.slug} onChange={() => updateParam("category", c.slug)} /> {c.name}
            </label>
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-sm text-ink-900 mb-2">Price Range</h4>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min"
            defaultValue={minPrice}
            onBlur={(e) => updateParam("min_price", e.target.value)}
            className="w-full border rounded-lg px-2 py-1 text-sm"
          />
          <input
            type="number"
            placeholder="Max"
            defaultValue={maxPrice}
            onBlur={(e) => updateParam("max_price", e.target.value)}
            className="w-full border rounded-lg px-2 py-1 text-sm"
          />
        </div>
      </div>

      {brands.length > 0 && (
        <div>
          <h4 className="font-semibold text-sm text-ink-900 mb-2">Brand</h4>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            <label className="flex items-center gap-2 text-sm text-ink-700">
              <input type="radio" checked={!brand} onChange={() => updateParam("brand", "")} /> All
            </label>
            {brands.map((b) => (
              <label key={b} className="flex items-center gap-2 text-sm text-ink-700">
                <input type="radio" checked={brand === b} onChange={() => updateParam("brand", b)} /> {b}
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <h4 className="font-semibold text-sm text-ink-900 mb-2">Minimum Rating</h4>
        <div className="flex gap-2">
          {[4, 3, 2, 1].map((r) => (
            <button
              key={r}
              onClick={() => updateParam("min_rating", minRating === String(r) ? "" : String(r))}
              className={`text-xs px-2 py-1 rounded-full border ${minRating === String(r) ? "bg-whisper-700 text-white border-whisper-700" : "border-gray-300"}`}
            >
              {r}★+
            </button>
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-sm text-ink-900 mb-2">Discount</h4>
        <div className="flex gap-2 flex-wrap">
          {[10, 20, 30, 50].map((d) => (
            <button
              key={d}
              onClick={() => updateParam("min_discount", minDiscount === String(d) ? "" : String(d))}
              className={`text-xs px-2 py-1 rounded-full border ${minDiscount === String(d) ? "bg-whisper-700 text-white border-whisper-700" : "border-gray-300"}`}
            >
              {d}% off+
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-ink-700">
        <input type="checkbox" checked={inStock === "true"} onChange={(e) => updateParam("in_stock", e.target.checked ? "true" : "")} />
        In stock only
      </label>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-ink-900">
          {q ? `Results for "${q}"` : "All Products"}
          {result && <span className="text-ink-600 font-normal text-sm"> · {result.total} items</span>}
        </h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowFilters((v) => !v)} className="md:hidden text-sm border rounded-lg px-3 py-1.5">
            Filters
          </button>
          <select
            value={sort}
            onChange={(e) => updateParam("sort", e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                Sort: {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid md:grid-cols-[220px_1fr] gap-6">
        <aside className={`bg-white rounded-xl2 shadow-card p-4 h-fit ${showFilters ? "block" : "hidden md:block"}`}>{FilterPanel}</aside>

        <div>
          {result === null && <ProductGridSkeleton count={12} />}
          {result && result.items.length === 0 && (
            <EmptyState title="No products found" subtitle="Try adjusting your filters or search terms." />
          )}
          {result && result.items.length > 0 && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {result.items.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>

              {result.total_pages > 1 && (
                <div className="flex justify-center gap-2 mt-8">
                  {Array.from({ length: result.total_pages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => goToPage(i + 1)}
                      className={`w-8 h-8 rounded-full text-sm ${page === i + 1 ? "bg-whisper-700 text-white" : "bg-white border border-gray-300"}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
