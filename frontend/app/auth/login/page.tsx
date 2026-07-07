"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../components/Toast";

export default function LoginPage() {
  const { login, user, loading: authLoading } = useAuth(); const router = useRouter(); const toast = useToast();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [loading, setLoading] = useState(false);

  // Already signed in - don't show the sign-in form again, go straight to the dashboard.
  useEffect(() => {
    if (!authLoading && user) router.replace("/dashboard");
  }, [authLoading, user, router]);

  if (authLoading || user) return null;
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    try { await login(email, password); toast.success("Welcome back!"); router.push("/dashboard"); }
    catch (err: any) { toast.error(err?.response?.data?.error || "Invalid email or password."); }
    finally { setLoading(false); }
  }
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-10 animate-fade-in bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50">
      <div className="w-full max-w-md">
        <div className="card-base p-8 sm:p-10">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-5 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-600 to-indigo-600 flex items-center justify-center font-black text-white shadow-glow">YW</div>
              <span className="font-extrabold text-xl text-gray-900">yot<span className="font-serif italic text-sky-600">week</span></span>
            </Link>
            <h1 className="font-extrabold text-2xl text-gray-900">Welcome back</h1>
            <p className="text-gray-400 text-sm mt-1">Sign in to your account</p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
              <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-base" placeholder="you@example.com" autoComplete="email" /></div>
            <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
              <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="input-base" placeholder="••••••••" autoComplete="current-password" /></div>
            <button type="submit" disabled={loading} className="btn-primary w-full !py-3 !rounded-xl !justify-center !text-base mt-2">{loading ? "Signing in…" : "Sign in"}</button>
          </form>
          <p className="text-center text-sm text-gray-400 mt-6">New here? <Link href="/auth/register" className="text-sky-600 font-semibold underline underline-offset-2">Create an account</Link></p>
        </div>
      </div>
    </div>
  );
}
