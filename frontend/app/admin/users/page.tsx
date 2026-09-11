"use client";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { Spinner } from "@/components/UI";
import type { User } from "@/types";

export default function AdminUsersPage() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[] | null>(null);

  function load() {
    api.get<User[]>("/api/admin/users").then(setUsers).catch(() => setUsers([]));
  }
  useEffect(load, []);

  async function toggleSuspend(u: User) {
    try {
      if (u.status === "ACTIVE") {
        await api.put(`/api/admin/users/${u.id}/suspend`);
        showToast(`${u.name} suspended`, "success");
      } else {
        await api.put(`/api/admin/users/${u.id}/activate`);
        showToast(`${u.name} activated`, "success");
      }
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not update user", "error");
    }
  }

  if (users === null) return <div className="py-16 flex justify-center"><Spinner size={28} /></div>;

  return (
    <div>
      <h1 className="text-xl font-display font-bold text-ink-900 mb-4">Users</h1>
      <div className="bg-white rounded-xl2 shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-whisper-50 text-ink-600 text-xs uppercase">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Role</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="p-3">{u.name}</td>
                <td className="p-3 text-ink-500">{u.email}</td>
                <td className="p-3">{u.role}</td>
                <td className="p-3">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${u.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                    {u.status}
                  </span>
                </td>
                <td className="p-3">
                  {u.role !== "ADMIN" && (
                    <button onClick={() => toggleSuspend(u)} className={`text-xs font-semibold ${u.status === "ACTIVE" ? "text-rose-600" : "text-emerald-600"}`}>
                      {u.status === "ACTIVE" ? "Suspend" : "Activate"}
                    </button>
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
