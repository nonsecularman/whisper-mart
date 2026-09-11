"use client";
import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { Spinner } from "@/components/UI";

export default function SellerRegisterPage() {
  const { user, loading, refreshUser } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [form, setForm] = useState({ store_name: "", owner_name: "", email: "", phone: "", description: "", address: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) setForm((f) => ({ ...f, owner_name: user.name, email: user.email }));
  }, [user]);

  useEffect(() => {
    if (!loading && !user) router.push("/auth/login?next=/seller/register");
    if (user?.role === "SELLER") router.push("/seller");
    if (user?.role === "ADMIN") router.push("/admin");
  }, [user, loading, router]);

  if (loading) return <div className="py-16 flex justify-center"><Spinner size={28} /></div>;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/api/sellers/register", form);
      await refreshUser();
      showToast("Seller account created! Awaiting admin approval.", "success");
      router.push("/seller");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not register as seller", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <div className="bg-white rounded-xl2 shadow-card p-8">
        <h1 className="text-2xl font-display font-bold text-ink-900 mb-1">Become a Seller</h1>
        <p className="text-sm text-ink-600 mb-6">Set up your store and start selling on Whisper Mart. Your account will need admin approval before your products go live.</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Store Name</label>
            <input required value={form.store_name} onChange={(e) => setForm({ ...form, store_name: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium">Owner Name</label>
            <input required value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium">Business Email</label>
            <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium">Phone</label>
            <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium">Store Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" rows={3} />
          </div>
          <div>
            <label className="text-sm font-medium">Business Address</label>
            <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" rows={2} />
          </div>
          <button disabled={busy} className="w-full bg-whisper-700 hover:bg-whisper-800 text-white font-semibold py-2.5 rounded-full disabled:opacity-50">
            {busy ? "Submitting..." : "Register as Seller"}
          </button>
        </form>
      </div>
    </div>
  );
}
