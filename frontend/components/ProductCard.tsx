"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { useToast } from "@/hooks/useToast";
import { api, ApiError } from "@/lib/api";
import type { ProductCard as ProductCardType } from "@/types";

export default function ProductCard({ product }: { product: ProductCardType }) {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const [wishlisted, setWishlisted] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      showToast("Please login to add items to your cart", "error");
      return;
    }
    setBusy(true);
    try {
      await addToCart(product.id, 1);
      showToast(`${product.name} added to cart`, "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not add to cart", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleWishlist(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      showToast("Please login to use wishlist", "error");
      return;
    }
    try {
      await api.post(`/api/wishlist/${product.id}`);
      setWishlisted(true);
      showToast("Added to wishlist", "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not update wishlist", "error");
    }
  }

  const outOfStock = product.stock <= 0 || product.status === "OUT_OF_STOCK";

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group bg-white rounded-xl2 shadow-card hover:shadow-cardHover transition-shadow duration-200 overflow-hidden flex flex-col relative"
    >
      <button
        onClick={handleWishlist}
        aria-label="Add to wishlist"
        className={`absolute top-2 right-2 z-10 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur bg-white/80 shadow ${
          wishlisted ? "text-accent" : "text-ink-600"
        }`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill={wishlisted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
          <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
        </svg>
      </button>

      <div className="relative w-full aspect-square bg-whisper-50 overflow-hidden">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, 220px"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink-600 text-xs">No image</div>
        )}
        {product.discount_percent > 0 && (
          <span className="absolute bottom-2 left-2 bg-accent text-white text-[11px] font-bold px-2 py-0.5 rounded-md">
            {product.discount_percent}% OFF
          </span>
        )}
        {outOfStock && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center text-sm font-semibold text-ink-800">
            Out of Stock
          </div>
        )}
      </div>

      <div className="p-3 flex flex-col gap-1 flex-1">
        {product.brand && <span className="text-[11px] uppercase tracking-wide text-whisper-600 font-semibold">{product.brand}</span>}
        <h3 className="text-sm font-medium text-ink-900 line-clamp-2 leading-snug">{product.name}</h3>

        <div className="flex items-center gap-1 text-xs">
          <span className="bg-emerald-600 text-white px-1.5 py-0.5 rounded flex items-center gap-0.5">
            {product.rating_avg > 0 ? product.rating_avg.toFixed(1) : "New"} ★
          </span>
          <span className="text-ink-600">({product.rating_count})</span>
        </div>

        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-base font-bold text-ink-900">₹{product.price.toLocaleString("en-IN")}</span>
          {product.original_price > product.price && (
            <span className="text-xs text-ink-600 line-through">₹{product.original_price.toLocaleString("en-IN")}</span>
          )}
        </div>

        <button
          onClick={handleAddToCart}
          disabled={busy || outOfStock}
          className="mt-auto pt-2 w-full text-sm font-semibold text-whisper-700 border border-whisper-200 rounded-lg py-1.5 hover:bg-whisper-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {outOfStock ? "Unavailable" : busy ? "Adding..." : "Add to Cart"}
        </button>
      </div>
    </Link>
  );
}
