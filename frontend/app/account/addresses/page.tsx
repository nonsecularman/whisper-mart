"use client";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import type { Address } from "@/types";

const emptyForm = { full_name: "", phone: "", street: "", city: "", state: "", postal_code: "", country: "India", address_type: "HOME" as const, is_default: false };

export default function AddressesPage() {
  const { showToast } = useToast();
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [busy, setBusy] = useState(false);

  function load() {
    api.get<Address[]>("/api/users/me/addresses").then(setAddresses);
  }

  useEffect(load, []);

  function startEdit(a: Address) {
    setEditingId(a.id);
    setForm(a);
    setShowForm(true);
  }

  function startAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  async function save() {
    setBusy(true);
    try {
      if (editingId) {
        await api.put(`/api/users/me/addresses/${editingId}`, form);
        showToast("Address updated", "success");
      } else {
        await api.post("/api/users/me/addresses", form);
        showToast("Address added", "success");
      }
      setShowForm(false);
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not save address", "error");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    try {
      await api.del(`/api/users/me/addresses/${id}`);
      showToast("Address deleted", "success");
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not delete address", "error");
    }
  }

  async function setDefault(id: string) {
    try {
      await api.put(`/api/users/me/addresses/${id}`, { is_default: true });
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not update address", "error");
    }
  }

  return (
    <div className="bg-white rounded-xl2 shadow-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg text-ink-900">My Addresses</h2>
        <button onClick={startAdd} className="text-sm font-semibold text-whisper-700">+ Add Address</button>
      </div>

      <div className="space-y-3">
        {addresses?.map((a) => (
          <div key={a.id} className="border rounded-xl p-4 flex justify-between items-start gap-4">
            <div className="text-sm">
              <p className="font-semibold">{a.full_name} <span className="text-ink-500 font-normal">· {a.phone}</span> {a.is_default && <span className="text-xs text-whisper-700 font-semibold ml-1">Default</span>}</p>
              <p className="text-ink-600">{a.street}, {a.city}, {a.state} {a.postal_code}, {a.country}</p>
              <p className="text-xs text-ink-400">{a.address_type}</p>
            </div>
            <div className="flex flex-col gap-1 text-xs shrink-0 items-end">
              <button onClick={() => startEdit(a)} className="text-whisper-700 font-semibold">Edit</button>
              <button onClick={() => remove(a.id)} className="text-rose-600 font-semibold">Delete</button>
              {!a.is_default && <button onClick={() => setDefault(a.id)} className="text-ink-500 font-semibold">Set Default</button>}
            </div>
          </div>
        ))}
        {addresses && addresses.length === 0 && <p className="text-sm text-ink-500">No addresses saved yet.</p>}
      </div>

      {showForm && (
        <div className="mt-6 border-t pt-4 space-y-3">
          <h3 className="font-semibold text-sm">{editingId ? "Edit Address" : "Add New Address"}</h3>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Full Name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="House/Street" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} className="border rounded-lg px-3 py-2 text-sm col-span-2" />
            <input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Postal Code" value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
            <select value={form.address_type} onChange={(e) => setForm({ ...form, address_type: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
              <option value="HOME">Home</option>
              <option value="WORK">Work</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} /> Set as default
          </label>
          <div className="flex gap-2">
            <button onClick={save} disabled={busy} className="bg-whisper-700 text-white text-sm font-semibold px-4 py-2 rounded-full disabled:opacity-50">
              {busy ? "Saving..." : "Save"}
            </button>
            <button onClick={() => setShowForm(false)} className="border border-gray-300 text-sm font-semibold px-4 py-2 rounded-full">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
