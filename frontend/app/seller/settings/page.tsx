"use client";
import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import type { Seller } from "@/types";
import { Spinner } from "@/components/UI";

export default function SellerSettingsPage() {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [form, setForm] = useState({ store_name: "", description: "", address: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    api.get<Seller>("/api/sellers/me").then((s) => {
      setSeller(s);
      setForm({ store_name: s.store_name, description: s.description || "", address: s.address || "", phone: s.phone });
    });
  }, []);

  async function save() {
    setBusy(true);
    try {
      const updated = await api.put<Seller>("/api/sellers/me", form);
      setSeller(updated);
      showToast("Store settings saved", "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not save settings", "error");
    } finally {
      setBusy(false);
    }
  }

  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.upload<{ url: string }>("/api/sellers/me/logo", formData);
      setSeller((prev) => (prev ? { ...prev, logo_url: res.url } : prev));
      showToast("Logo updated", "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Upload failed", "error");
    } finally {
      setUploadingLogo(false);
    }
  }

  if (!seller) return <div className="py-16 flex justify-center"><Spinner size={28} /></div>;

  return (
    <div className="bg-white rounded-xl2 shadow-card p-6 max-w-xl">
      <h1 className="text-xl font-display font-bold text-ink-900 mb-4">Store Settings</h1>

      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-full bg-whisper-100 overflow-hidden flex items-center justify-center text-whisper-700 font-bold text-xl">
          {seller.logo_url ? <img src={seller.logo_url} alt="" className="w-full h-full object-cover" /> : seller.store_name.charAt(0)}
        </div>
        <button onClick={() => fileInputRef.current?.click()} className="text-sm font-semibold text-whisper-700" disabled={uploadingLogo}>
          {uploadingLogo ? "Uploading..." : "Change Logo"}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={uploadLogo} className="hidden" />
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">Store Name</label>
          <input value={form.store_name} onChange={(e) => setForm({ ...form, store_name: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium">Phone</label>
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium">Description</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium">Address</label>
          <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <button onClick={save} disabled={busy} className="bg-whisper-700 text-white text-sm font-semibold px-5 py-2.5 rounded-full disabled:opacity-50">
          {busy ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
