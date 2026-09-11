"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Spinner } from "@/components/UI";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/sellers", label: "Sellers" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/coupons", label: "Coupons" },
  { href: "/admin/reviews", label: "Reviews" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.role !== "ADMIN")) router.push("/");
  }, [loading, user, router]);

  if (loading || !user || user.role !== "ADMIN") {
    return <div className="py-16 flex justify-center"><Spinner size={28} /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 grid md:grid-cols-[220px_1fr] gap-6">
      <aside className="bg-ink-950 text-white rounded-xl2 p-4 h-fit">
        <p className="font-semibold mb-1">Admin Panel</p>
        <p className="text-xs text-gray-400 mb-4">{user.email}</p>
        <nav className="flex flex-col gap-1 text-sm">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2 rounded-lg ${pathname === item.href ? "bg-whisper-700 font-semibold" : "text-gray-300 hover:bg-white/10"}`}
            >
              {item.label}
            </Link>
          ))}
          <button onClick={logout} className="px-3 py-2 rounded-lg text-left text-rose-400 hover:bg-white/10">Logout</button>
        </nav>
      </aside>
      <div>{children}</div>
    </div>
  );
}
