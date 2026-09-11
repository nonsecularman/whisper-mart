"use client";
import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { ApiError } from "@/lib/api";

export default function RegisterPage() {
  const { register } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await register(name, email, password, phone);
      showToast("Account created!", "success");
      router.push("/");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Registration failed", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-white rounded-xl2 shadow-card p-8">
        <h1 className="text-2xl font-display font-bold text-ink-900 mb-1">Create your account</h1>
        <p className="text-sm text-ink-600 mb-6">Join Whisper Mart in seconds</p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-ink-800">Full Name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-ink-800">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-ink-800">Phone (optional)</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-ink-800">Password</label>
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
            <p className="text-xs text-ink-500 mt-1">At least 6 characters</p>
          </div>
          <button type="submit" disabled={busy} className="w-full bg-whisper-700 hover:bg-whisper-800 text-white font-semibold py-2.5 rounded-full transition-colors disabled:opacity-50">
            {busy ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="text-sm text-ink-600 mt-6 text-center">
          Already have an account? <Link href="/auth/login" className="text-whisper-700 font-semibold">Login</Link>
        </p>
      </div>
    </div>
  );
}
