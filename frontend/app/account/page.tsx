"use client";
import { useState, FormEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { api, ApiError } from "@/lib/api";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [busy, setBusy] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.put("/api/users/me", { name, phone });
      await refreshUser();
      showToast("Profile updated", "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not update profile", "error");
    } finally {
      setBusy(false);
    }
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    setPwBusy(true);
    try {
      await api.post("/api/auth/change-password", { current_password: currentPassword, new_password: newPassword });
      showToast("Password changed", "success");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not change password", "error");
    } finally {
      setPwBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl2 shadow-card p-6">
        <h2 className="font-semibold text-lg text-ink-900 mb-4">Profile</h2>
        <form onSubmit={saveProfile} className="space-y-4 max-w-md">
          <div>
            <label className="text-sm font-medium text-ink-800">Full Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-ink-800">Email</label>
            <input value={user?.email} disabled className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 text-ink-500" />
          </div>
          <div>
            <label className="text-sm font-medium text-ink-800">Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <button disabled={busy} className="bg-whisper-700 text-white text-sm font-semibold px-5 py-2.5 rounded-full disabled:opacity-50">
            {busy ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl2 shadow-card p-6">
        <h2 className="font-semibold text-lg text-ink-900 mb-4">Change Password</h2>
        <form onSubmit={changePassword} className="space-y-4 max-w-md">
          <div>
            <label className="text-sm font-medium text-ink-800">Current Password</label>
            <input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-ink-800">New Password</label>
            <input type="password" required minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <button disabled={pwBusy} className="bg-whisper-700 text-white text-sm font-semibold px-5 py-2.5 rounded-full disabled:opacity-50">
            {pwBusy ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
