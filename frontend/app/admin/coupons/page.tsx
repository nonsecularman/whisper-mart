"use client";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { Spinner } from "@/components/UI";
import type { Coupon } from "@/types";

const emptyForm = {
  code: "", discount_type: "PERCENTAGE" as "PERCENTAGE" | "FIXED", discount_value: "",
  min_order_amount: "0", max_discount_amount: "", start_date: "", expiry_date: "", usage_limit: "",
};

export default function AdminCouponsPage() {
  const { showToast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);

  function load() {
    api.get<Coupon[]>("/api/coupons").then(setCoupons).catch(() => setCoupons([]));
  }
  useEffect(load, []);

  async function createCoupon() {
    setBusy(true);
    try {
      await api.post("/api/coupons", {
        code: form.code,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        min_order_amount: Number(form.min_order_amount || 0),
        max_discount_amount: form.max_discount_amount ? Number(form.max_discount_amount) : null,
        start_date: new Date(form.start_date).toISOString(),
        expiry_date: new Date(form.expiry_date).toISOString(),
        usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
      });
      showToast("Coupon created", "success");
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not create coupon", "error");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(c: Coupon) {
    try {
      await api.put(`/api/coupons/${c.id}`, { is_active: !c.is_active });
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not update coupon", "error");
    }
  }

  async function deleteCoupon(id: string) {
    if (!confirm("Delete this coupon?")) return;
    try {
      await api.del(`/api/coupons/${id}`);
      showToast("Coupon deleted", "success");
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not delete coupon", "error");
    }
  }

  if (coupons === null) return <div className="py-16 flex justify-center"><Spinner size={28} /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-display font-bold text-ink-900">Coupons</h1>
        <button onClick={() => setShowForm((v) => !v)} className="bg-whisper-700 text-white text-sm font-semibold px-4 py-2 rounded-full">
          {showForm ? "Cancel" : "+ New Coupon"}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl2 shadow-card p-4 mb-4 grid md:grid-cols-3 gap-3">
          <input placeholder="CODE" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="border rounded-lg px-3 py-2 text-sm" />
          <select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value as any })} className="border rounded-lg px-3 py-2 text-sm">
            <option value="PERCENTAGE">Percentage</option>
            <option value="FIXED">Fixed Amount</option>
          </select>
          <input type="number" placeholder="Discount Value" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
          <input type="number" placeholder="Min Order Amount" value={form.min_order_amount} onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
          <input type="number" placeholder="Max Discount (optional)" value={form.max_discount_amount} onChange={(e) => setForm({ ...form, max_discount_amount: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
          <input type="number" placeholder="Usage Limit (optional)" value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
          <div>
            <label className="text-xs text-ink-500">Start Date</label>
            <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-ink-500">Expiry Date</label>
            <input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <button onClick={createCoupon} disabled={busy} className="bg-whisper-700 text-white text-sm font-semibold rounded-full py-2 disabled:opacity-50">
            {busy ? "Creating..." : "Create Coupon"}
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl2 shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-whisper-50 text-ink-600 text-xs uppercase">
            <tr>
              <th className="text-left p-3">Code</th>
              <th className="text-left p-3">Discount</th>
              <th className="text-left p-3">Min Order</th>
              <th className="text-left p-3">Usage</th>
              <th className="text-left p-3">Expiry</th>
              <th className="text-left p-3">Active</th>
              <th className="text-left p-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {coupons.map((c) => (
              <tr key={c.id}>
                <td className="p-3 font-mono font-semibold">{c.code}</td>
                <td className="p-3">{c.discount_type === "PERCENTAGE" ? `${c.discount_value}%` : `₹${c.discount_value}`}</td>
                <td className="p-3">₹{c.min_order_amount}</td>
                <td className="p-3">{c.used_count}{c.usage_limit ? ` / ${c.usage_limit}` : ""}</td>
                <td className="p-3 text-ink-500">{new Date(c.expiry_date).toLocaleDateString()}</td>
                <td className="p-3">
                  <button onClick={() => toggleActive(c)} className={`text-xs font-semibold px-2 py-1 rounded-full ${c.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-600"}`}>
                    {c.is_active ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="p-3">
                  <button onClick={() => deleteCoupon(c.id)} className="text-rose-600 font-semibold text-xs">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {coupons.length === 0 && <p className="p-4 text-sm text-ink-500">No coupons yet.</p>}
      </div>
    </div>
  );
}
