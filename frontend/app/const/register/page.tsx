"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../components/Toast";

export default function AdminSetupPage() {
  const { user, loading: authLoading, adminSetup } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [checking, setChecking] = useState(true);
  const [adminExists, setAdminExists] = useState<boolean | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  function u(k: keyof typeof form, v: string) { setForm(f => ({ ...f, [k]: v })); }

  useEffect(() => {
    if (!authLoading && user?.role === "ADMIN") { router.replace("/const"); return; }
    api.get("/auth/admin/exists")
      .then(r => setAdminExists(r.data.exists))
      .catch(() => setAdminExists(true)) // fail closed — don't offer bootstrap if we can't confirm it's safe
      .finally(() => setChecking(false));
  }, [authLoading, user, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await adminSetup(form);
      toast.success("Admin account created. Welcome to yotweek.");
      router.push("/const");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Could not create the admin account.");
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || checking || (user && user.role === "ADMIN")) return null;

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-2xl mx-auto mb-4 shadow-glow">🛡️</div>
          <h1 className="font-extrabold text-2xl text-white">
            {adminExists ? "Admin already set up" : "Create the admin account"}
          </h1>
          <p className="text-white/50 text-sm mt-1">
            {adminExists
              ? "This platform already has an administrator."
              : "This one-time setup creates the platform's first and only bootstrap admin."}
          </p>
        </div>

        {adminExists ? (
          <div className="bg-white/[0.06] backdrop-blur border border-white/10 rounded-2xl p-6 text-center space-y-4">
            <p className="text-sm text-white/60">
              To get admin access, ask an existing administrator to promote your account from the Users panel, then sign in below.
            </p>
            <Link href="/const/login" className="inline-flex justify-center w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-sm hover:opacity-90 transition-opacity">
              Go to Admin Console sign in
            </Link>
          </div>
        ) : (
          <>
            <form onSubmit={submit} className="bg-white/[0.06] backdrop-blur border border-white/10 rounded-2xl p-6 space-y-4">
              <label className="block">
                <span className="block text-sm font-semibold text-white/70 mb-1.5">Full name</span>
                <input required value={form.name} onChange={e => u("name", e.target.value)}
                  className="w-full rounded-xl bg-white/10 border border-white/10 text-white placeholder-white/30 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="Rye Okello" />
              </label>
              <label className="block">
                <span className="block text-sm font-semibold text-white/70 mb-1.5">Admin email</span>
                <input required type="email" value={form.email} onChange={e => u("email", e.target.value)}
                  className="w-full rounded-xl bg-white/10 border border-white/10 text-white placeholder-white/30 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="admin@yotweek.com" autoComplete="username" />
              </label>
              <label className="block">
                <span className="block text-sm font-semibold text-white/70 mb-1.5">Password</span>
                <input required type="password" minLength={8} value={form.password} onChange={e => u("password", e.target.value)}
                  className="w-full rounded-xl bg-white/10 border border-white/10 text-white placeholder-white/30 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="At least 8 characters" autoComplete="new-password" />
              </label>
              <button type="submit" disabled={submitting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
                {submitting ? "Creating…" : "Create admin account"}
              </button>
            </form>
            <div className="rounded-xl bg-amber-500/10 border border-amber-400/20 p-4 text-xs text-amber-200 flex gap-2 mt-4">
              <span>⚠️</span>
              <p>This form only works once. As soon as this account is created, it locks itself — anyone else who lands here will be turned away.</p>
            </div>
          </>
        )}

        <p className="text-center text-xs text-white/30 mt-6">
          Already an admin? <Link href="/const/login" className="text-violet-300 hover:text-violet-200 font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
