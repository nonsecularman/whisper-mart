"use client";
import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email, password);
      showToast("Welcome back!", "success");
      router.push("/");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Login failed", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-white rounded-xl2 shadow-card p-8">
        <h1 className="text-2xl font-display font-bold text-ink-900 mb-1">Welcome back</h1>
        <p className="text-sm text-ink-600 mb-6">Login to your Whisper Mart account</p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-ink-800">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-ink-800">Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <button type="submit" disabled={busy} className="w-full bg-whisper-700 hover:bg-whisper-800 text-white font-semibold py-2.5 rounded-full transition-colors disabled:opacity-50">
            {busy ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="text-sm text-ink-600 mt-6 text-center">
          New here? <Link href="/auth/register" className="text-whisper-700 font-semibold">Create an account</Link>
        </p>

        <div className="mt-6 pt-6 border-t text-xs text-ink-500 space-y-1">
          <p className="font-semibold text-ink-700">Demo credentials:</p>
          <p>Admin: admin@wm-demo.example.com / Admin@123</p>
          <p>Seller: seller@wm-demo.example.com / Seller@123</p>
          <p>Customer: customer@wm-demo.example.com / Customer@123</p>
        </div>
      </div>
    </div>
  );
}
