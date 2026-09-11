"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { useToast } from "@/hooks/useToast";
import { EmptyState, ProductGridSkeleton } from "@/components/UI";
import type { WishlistItem } from "@/types";

export default function WishlistPage() {
  const { user } = useAuth();
  const { refreshCart } = useCart();
  const { showToast } = useToast();
  const [items, setItems] = useState<WishlistItem[] | null>(null);

  useEffect(() => {
    if (!user) return;
    api.get<WishlistItem[]>("/api/wishlist").then(setItems).catch(() => setItems([]));
  }, [user]);

  if (!user) {
    return (
      <EmptyState
        title="Login to view your wishlist"
        action={
          <Link href="/auth/login" className="bg-whisper-700 text-white px-5 py-2 rounded-full font-semibold">
            Login
          </Link>
        }
      />
    );
  }

  async function remove(productId: string) {
    try {
      const updated = await api.del<WishlistItem[]>(`/api/wishlist/${productId}`);
      setItems(updated);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not remove item", "error");
    }
  }

  async function moveToCart(productId: string) {
    try {
      const updated = await api.post<WishlistItem[]>(`/api/wishlist/${productId}/move-to-cart`);
      setItems(updated);
      await refreshCart();
      showToast("Moved to cart", "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not move to cart", "error");
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-lg font-semibold text-ink-900 mb-4">My Wishlist</h1>
      {items === null && <ProductGridSkeleton count={8} />}
      {items && items.length === 0 && (
        <EmptyState
          title="Your wishlist is empty"
          subtitle="Save items you love to buy them later."
          action={
            <Link href="/search" className="bg-whisper-700 text-white px-5 py-2 rounded-full font-semibold">
              Browse Products
            </Link>
          }
        />
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {items?.map((item) => (
          <div key={item.id} className="bg-white rounded-xl2 shadow-card overflow-hidden flex flex-col">
            <Link href={`/product/${item.slug}`} className="relative aspect-square bg-whisper-50 block">
              {item.image && <Image src={item.image} alt={item.name} fill className="object-cover" />}
            </Link>
            <div className="p-3 flex flex-col gap-2 flex-1">
              <Link href={`/product/${item.slug}`} className="text-sm font-medium text-ink-900 line-clamp-2 hover:underline">
                {item.name}
              </Link>
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-ink-900">₹{item.price.toLocaleString("en-IN")}</span>
                {item.discount_percent > 0 && <span className="text-xs text-emerald-600">{item.discount_percent}% off</span>}
              </div>
              <div className="mt-auto flex gap-2">
                <button
                  onClick={() => moveToCart(item.product_id)}
                  disabled={item.stock <= 0}
                  className="flex-1 text-xs font-semibold bg-whisper-700 text-white rounded-lg py-1.5 disabled:opacity-50"
                >
                  {item.stock <= 0 ? "Out of stock" : "Move to Cart"}
                </button>
                <button onClick={() => remove(item.product_id)} className="text-xs font-semibold border border-gray-300 rounded-lg px-2">
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
