"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../context/AuthContext";

const ROLES = [
  { value: "USER", label: "Individual / registered user" },
  { value: "AGENT", label: "Agent" },
  { value: "COMPANY", label: "Company" },
  { value: "ORGANIZATION", label: "Organization" },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "USER", organizationName: "", country: "", city: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await register(form);
      router.push("/");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Could not create account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-page flex max-w-md flex-col py-16">
      <h1 className="mb-2 font-display text-3xl font-bold">Create an account</h1>
      <p className="mb-6 text-sm text-savanna-900/60">Individuals, companies, agents, and organizations can all post events — every listing goes through admin review.</p>
      <form onSubmit={submit} className="space-y-4">
        <input required placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-xl border border-savanna-900/15 px-4 py-2.5 text-sm" />
        <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-xl border border-savanna-900/15 px-4 py-2.5 text-sm" />
        <input required type="password" placeholder="Password (min 8 characters)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full rounded-xl border border-savanna-900/15 px-4 py-2.5 text-sm" />
        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full rounded-xl border border-savanna-900/15 px-4 py-2.5 text-sm">
          {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        {form.role !== "USER" && (
          <input required placeholder="Organization / business name" value={form.organizationName} onChange={(e) => setForm({ ...form, organizationName: e.target.value })} className="w-full rounded-xl border border-savanna-900/15 px-4 py-2.5 text-sm" />
        )}
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="rounded-xl border border-savanna-900/15 px-4 py-2.5 text-sm" />
          <input placeholder="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="rounded-xl border border-savanna-900/15 px-4 py-2.5 text-sm" />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Creating account…" : "Create account"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
      <p className="mt-6 text-sm text-savanna-900/60">
        Already have an account? <Link href="/auth/login" className="text-sunset-600 underline">Sign in</Link>
      </p>
    </div>
  );
}
