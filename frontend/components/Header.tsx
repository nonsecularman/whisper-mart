"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, FormEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";

export default function Header() {
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
    setMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-40 bg-whisper-700 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
        <Link href="/" className="font-display font-extrabold text-xl tracking-tight shrink-0">
          Whisper<span className="text-accent">Mart</span>
        </Link>

        <form onSubmit={onSearch} className="flex-1 hidden md:flex">
          <div className="flex w-full bg-white rounded-full overflow-hidden shadow-inner">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search for products, brands and more"
              className="flex-1 px-4 py-2 text-ink-900 text-sm outline-none"
            />
            <button type="submit" className="px-4 bg-accent hover:bg-accent-light transition-colors text-white text-sm font-semibold">
              Search
            </button>
          </div>
        </form>

        <nav className="hidden md:flex items-center gap-5 text-sm font-medium shrink-0">
          <Link href="/search" className="hover:text-accent-light transition-colors">Categories</Link>
          <Link href="/wishlist" className="hover:text-accent-light transition-colors">Wishlist</Link>
          <Link href="/cart" className="relative hover:text-accent-light transition-colors">
            Cart
            {cart && cart.item_count > 0 && (
              <span className="absolute -top-2 -right-3 bg-accent text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                {cart.item_count}
              </span>
            )}
          </Link>
          {user ? (
            <div className="relative group">
              <button className="hover:text-accent-light transition-colors">Hi, {user.name.split(" ")[0]}</button>
              <div className="absolute right-0 top-full pt-2 hidden group-hover:block">
                <div className="bg-white text-ink-900 rounded-xl shadow-cardHover py-2 w-48 text-sm">
                  <Link href="/account" className="block px-4 py-2 hover:bg-whisper-50">My Account</Link>
                  <Link href="/account/orders" className="block px-4 py-2 hover:bg-whisper-50">Orders</Link>
                  {user.role === "SELLER" && <Link href="/seller" className="block px-4 py-2 hover:bg-whisper-50">Seller Dashboard</Link>}
                  {user.role === "CUSTOMER" && <Link href="/seller/register" className="block px-4 py-2 hover:bg-whisper-50">Become a Seller</Link>}
                  {user.role === "ADMIN" && <Link href="/admin" className="block px-4 py-2 hover:bg-whisper-50">Admin Panel</Link>}
                  <button onClick={logout} className="w-full text-left px-4 py-2 hover:bg-whisper-50 text-rose-600">Logout</button>
                </div>
              </div>
            </div>
          ) : (
            <Link href="/auth/login" className="bg-white text-whisper-700 px-4 py-1.5 rounded-full font-semibold hover:bg-whisper-50 transition-colors">
              Account
            </Link>
          )}
        </nav>

        <button className="md:hidden ml-auto" onClick={() => setMenuOpen((v) => !v)} aria-label="Menu">
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-whisper-800 px-4 py-4 space-y-3">
          <form onSubmit={onSearch} className="flex bg-white rounded-full overflow-hidden">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products..." className="flex-1 px-4 py-2 text-ink-900 text-sm outline-none" />
            <button type="submit" className="px-4 bg-accent text-white text-sm font-semibold">Go</button>
          </form>
          <div className="flex flex-col gap-2 text-sm font-medium">
            <Link href="/search" onClick={() => setMenuOpen(false)}>Categories</Link>
            <Link href="/wishlist" onClick={() => setMenuOpen(false)}>Wishlist</Link>
            <Link href="/cart" onClick={() => setMenuOpen(false)}>Cart {cart && cart.item_count > 0 ? `(${cart.item_count})` : ""}</Link>
            {user ? (
              <>
                <Link href="/account" onClick={() => setMenuOpen(false)}>My Account</Link>
                <Link href="/account/orders" onClick={() => setMenuOpen(false)}>Orders</Link>
                {user.role === "SELLER" && <Link href="/seller" onClick={() => setMenuOpen(false)}>Seller Dashboard</Link>}
                {user.role === "ADMIN" && <Link href="/admin" onClick={() => setMenuOpen(false)}>Admin Panel</Link>}
                <button onClick={logout} className="text-left text-rose-300">Logout</button>
              </>
            ) : (
              <Link href="/auth/login" onClick={() => setMenuOpen(false)}>Login / Register</Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
