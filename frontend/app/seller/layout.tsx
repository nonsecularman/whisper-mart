"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Spinner } from "@/components/UI";
import type { Seller } from "@/types";

const NAV = [
  { href: "/seller", label: "Dashboard" },
  { href: "/seller/products", label: "Products" },
  { href: "/seller/products/new", label: "Add Product" },
  { href: "/seller/orders", label: "Orders" },
  { href: "/seller/inventory", label: "Inventory" },
  { href: "/seller/settings", label: "Store Settings" },
];

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [seller, setSeller] = useState<Seller | null | undefined>(undefined);

  useEffect(() => {
    if (!loading && !user) router.push("/auth/login?next=/seller");
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === "SELLER") {
      api.get<Seller>("/api/sellers/me").then(setSeller).catch(() => setSeller(null));
    } else if (user) {
      setSeller(null);
    }
  }, [user]);

  if (loading || !user || seller === undefined) {
    return <div className="py-16 flex justify-center"><Spinner size={28} /></div>;
  }

  if (user.role !== "SELLER" || !seller) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-ink-900 mb-2">You don't have a seller account yet</h1>
        <Link href="/seller/register" className="inline-block bg-whisper-700 text-white px-5 py-2.5 rounded-full font-semibold mt-2">
          Register as Seller
        </Link>
      </div>
    );
  }

  if (seller.status !== "APPROVED") {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-ink-900 mb-2">Seller account: {seller.status}</h1>
        <p className="text-sm text-ink-600">
          {seller.status === "PENDING" && "Your store is awaiting admin approval. You'll be able to list products once approved."}
          {seller.status === "REJECTED" && "Your seller application was rejected. Contact support for details."}
          {seller.status === "SUSPENDED" && "Your seller account has been suspended. Contact support for details."}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 grid md:grid-cols-[220px_1fr] gap-6">
      <aside className="bg-white rounded-xl2 shadow-card p-4 h-fit">
        <p className="font-semibold text-ink-900 mb-1">{seller.store_name}</p>
        <p className="text-xs text-emerald-600 font-semibold mb-4">● Approved</p>
        <nav className="flex flex-col gap-1 text-sm">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2 rounded-lg ${pathname === item.href ? "bg-whisper-700 text-white font-semibold" : "text-ink-700 hover:bg-whisper-50"}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div>{children}</div>
    </div>
  );
}
