"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../components/Toast";

export default function AdminLoginPage() {
  const { user, loading: authLoading, adminLogin } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Already signed in as an admin — go straight to the panel.
  useEffect(() => {
    if (!authLoading && user?.role === "ADMIN") router.replace("/const");
  }, [authLoading, user, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await adminLogin(email, password);
      toast.success("Welcome back, admin.");
      router.push("/const");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Invalid admin credentials.");
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || (user && user.role === "ADMIN")) return null;

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-2xl mx-auto mb-4 shadow-glow">🔐</div>
          <h1 className="font-extrabold text-2xl text-white">Admin Console</h1>
          <p className="text-white/50 text-sm mt-1">Sign in with your administrator account.</p>
        </div>

        <form onSubmit={submit} className="bg-white/[0.06] backdrop-blur border border-white/10 rounded-2xl p-6 space-y-4">
          <label className="block">
            <span className="block text-sm font-semibold text-white/70 mb-1.5">Admin email</span>
            <input required type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full rounded-xl bg-white/10 border border-white/10 text-white placeholder-white/30 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="admin@yotweek.com" autoComplete="username" />
          </label>
          <label className="block">
            <span className="block text-sm font-semibold text-white/70 mb-1.5">Password</span>
            <input required type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full rounded-xl bg-white/10 border border-white/10 text-white placeholder-white/30 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="••••••••" autoComplete="current-password" />
          </label>
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
            {loading ? "Signing in…" : "Sign in to Admin Console"}
          </button>
        </form>

        <div className="text-center mt-6 space-y-2">
          <p className="text-xs text-white/30">
            Setting up for the first time?{" "}
            <Link href="/const/register" className="text-violet-300 hover:text-violet-200 font-medium">Create the admin account</Link>
          </p>
          <p className="text-xs text-white/30">
            Not an admin? <Link href="/auth/login" className="text-white/50 hover:text-white/70 font-medium">Go to regular sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
