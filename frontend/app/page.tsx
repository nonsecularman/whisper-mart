"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Category, PaginatedProducts, ProductCard as ProductCardType } from "@/types";
import ProductCard from "@/components/ProductCard";
import { ProductGridSkeleton } from "@/components/UI";

function Section({
  title,
  subtitle,
  href,
  children,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-xl md:text-2xl font-display font-bold text-ink-900">{title}</h2>
          {subtitle && <p className="text-sm text-ink-600 mt-0.5">{subtitle}</p>}
        </div>
        {href && (
          <Link href={href} className="text-sm font-semibold text-whisper-700 hover:underline shrink-0">
            View all →
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export default function HomePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [trending, setTrending] = useState<ProductCardType[] | null>(null);
  const [bestSellers, setBestSellers] = useState<ProductCardType[] | null>(null);
  const [deals, setDeals] = useState<ProductCardType[] | null>(null);
  const [newArrivals, setNewArrivals] = useState<ProductCardType[] | null>(null);
  const [recommended, setRecommended] = useState<ProductCardType[] | null>(null);

  useEffect(() => {
    api.get<Category[]>("/api/categories").then(setCategories).catch(() => setCategories([]));
    api.get<PaginatedProducts>("/api/products", { sort: "relevance", page_size: 10 }).then((r) => setTrending(r.items)).catch(() => setTrending([]));
    api.get<PaginatedProducts>("/api/products", { sort: "relevance", page_size: 10, featured: true }).then((r) => setBestSellers(r.items)).catch(() => setBestSellers([]));
    api.get<PaginatedProducts>("/api/products", { min_discount: 20, sort: "price_asc", page_size: 10 }).then((r) => setDeals(r.items)).catch(() => setDeals([]));
    api.get<PaginatedProducts>("/api/products", { sort: "newest", page_size: 10 }).then((r) => setNewArrivals(r.items)).catch(() => setNewArrivals([]));
    api.get<PaginatedProducts>("/api/products", { sort: "rating", page_size: 10 }).then((r) => setRecommended(r.items)).catch(() => setRecommended([]));
  }, []);

  function Grid({ items }: { items: ProductCardType[] | null }) {
    if (items === null) return <ProductGridSkeleton />;
    if (items.length === 0) return <p className="text-sm text-ink-600">Nothing here yet — check back soon.</p>;
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {items.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-whisper-700 via-whisper-600 to-whisper-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-14 md:py-20 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <p className="uppercase tracking-widest text-whisper-200 text-xs font-semibold mb-3">Whisper Mart Marketplace</p>
            <h1 className="font-display text-3xl md:text-5xl font-extrabold leading-tight mb-4">
              Shop everything.<br />Trust everyone.
            </h1>
            <p className="text-whisper-100 mb-6 max-w-md">
              Thousands of independently vetted sellers, unbeatable deals, and a checkout that just works.
            </p>
            <Link href="/search" className="inline-block bg-accent hover:bg-accent-light transition-colors px-6 py-3 rounded-full font-semibold">
              Start Shopping
            </Link>
          </div>
          <div className="hidden md:grid grid-cols-2 gap-4">
            {["Electronics", "Fashion", "Home & Kitchen", "Beauty"].map((label, i) => (
              <div key={label} className={`rounded-xl2 bg-white/10 backdrop-blur p-6 ${i % 2 === 1 ? "mt-6" : ""}`}>
                <p className="font-semibold">{label}</p>
                <p className="text-xs text-whisper-200 mt-1">Explore now</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <h2 className="text-xl font-display font-bold text-ink-900 mb-4">Featured Categories</h2>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {(categories.length ? categories : Array.from({ length: 8 })).map((c: any, i) => (
            <Link
              key={c?.id ?? i}
              href={c ? `/category/${c.slug}` : "#"}
              className="flex flex-col items-center gap-2 shrink-0 w-20 group"
            >
              <div className="w-16 h-16 rounded-full bg-white shadow-card flex items-center justify-center text-whisper-700 font-bold text-lg group-hover:shadow-cardHover transition-shadow">
                {c ? c.name.charAt(0) : ""}
              </div>
              <span className="text-xs text-center text-ink-800 font-medium truncate w-full">{c?.name ?? ""}</span>
            </Link>
          ))}
        </div>
      </section>

      <Section title="Trending Products" subtitle="What everyone's adding to cart right now" href="/search?sort=relevance">
        <Grid items={trending} />
      </Section>

      <Section title="Best Sellers" subtitle="Top-rated picks across the marketplace" href="/search?featured=true">
        <Grid items={bestSellers} />
      </Section>

      <section className="bg-whisper-900 text-white">
        <Section title="Today's Deals" subtitle="Limited-time discounts of 20% or more" href="/search?min_discount=20">
          <Grid items={deals} />
        </Section>
      </section>

      <Section title="Recommended For You" subtitle="Highly rated by other shoppers" href="/search?sort=rating">
        <Grid items={recommended} />
      </Section>

      <Section title="New Arrivals" subtitle="Fresh listings from our sellers" href="/search?sort=newest">
        <Grid items={newArrivals} />
      </Section>

      {/* Promo banner */}
      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="rounded-xl2 bg-gradient-to-r from-accent to-whisper-600 text-white p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl font-display font-bold mb-2">Sell on Whisper Mart</h3>
            <p className="text-white/90 max-w-md">Reach thousands of shoppers. Set up your store in minutes and start selling today.</p>
          </div>
          <Link href="/seller/register" className="bg-white text-whisper-700 px-6 py-3 rounded-full font-semibold shrink-0 hover:bg-whisper-50 transition-colors">
            Become a Seller
          </Link>
        </div>
      </section>
    </div>
  );
}
