"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Spinner } from "@/components/UI";

const NAV = [
  { href: "/account", label: "Profile" },
  { href: "/account/orders", label: "Orders" },
  { href: "/wishlist", label: "Wishlist" },
  { href: "/account/addresses", label: "Addresses" },
  { href: "/account/settings", label: "Settings" },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/auth/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return <div className="py-16 flex justify-center"><Spinner size={28} /></div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 grid md:grid-cols-[220px_1fr] gap-6">
      <aside className="bg-white rounded-xl2 shadow-card p-4 h-fit">
        <div className="mb-4 pb-4 border-b">
          <p className="font-semibold text-ink-900">{user.name}</p>
          <p className="text-xs text-ink-500">{user.email}</p>
        </div>
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
          <button onClick={logout} className="px-3 py-2 rounded-lg text-left text-rose-600 hover:bg-rose-50">Logout</button>
        </nav>
      </aside>
      <div>{children}</div>
    </div>
  );
}
