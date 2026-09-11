"use client";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { Spinner } from "@/components/UI";
import type { Category } from "@/types";

export default function AdminCategoriesPage() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    api.get<Category[]>("/api/categories").then(setCategories).catch(() => setCategories([]));
  }
  useEffect(load, []);

  async function addCategory() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await api.post("/api/categories", { name: name.trim() });
      showToast("Category created", "success");
      setName("");
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not create category", "error");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(id: string) {
    try {
      await api.put(`/api/categories/${id}`, { name: editName });
      showToast("Category updated", "success");
      setEditingId(null);
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not update category", "error");
    }
  }

  async function deleteCategory(id: string) {
    if (!confirm("Delete this category?")) return;
    try {
      await api.del(`/api/categories/${id}`);
      showToast("Category deleted", "success");
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not delete category", "error");
    }
  }

  if (categories === null) return <div className="py-16 flex justify-center"><Spinner size={28} /></div>;

  return (
    <div>
      <h1 className="text-xl font-display font-bold text-ink-900 mb-4">Categories</h1>

      <div className="bg-white rounded-xl2 shadow-card p-4 mb-4 flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category name" className="flex-1 border rounded-lg px-3 py-2 text-sm" />
        <button onClick={addCategory} disabled={busy} className="bg-whisper-700 text-white text-sm font-semibold px-4 py-2 rounded-full disabled:opacity-50">
          Add
        </button>
      </div>

      <div className="bg-white rounded-xl2 shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-whisper-50 text-ink-600 text-xs uppercase">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Slug</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {categories.map((c) => (
              <tr key={c.id}>
                <td className="p-3">
                  {editingId === c.id ? (
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} className="border rounded-lg px-2 py-1 text-sm" />
                  ) : (
                    c.name
                  )}
                </td>
                <td className="p-3 text-ink-500">{c.slug}</td>
                <td className="p-3 flex gap-3">
                  {editingId === c.id ? (
                    <>
                      <button onClick={() => saveEdit(c.id)} className="text-emerald-600 font-semibold">Save</button>
                      <button onClick={() => setEditingId(null)} className="text-ink-500 font-semibold">Cancel</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setEditingId(c.id); setEditName(c.name); }} className="text-whisper-700 font-semibold">Edit</button>
                      <button onClick={() => deleteCategory(c.id)} className="text-rose-600 font-semibold">Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
