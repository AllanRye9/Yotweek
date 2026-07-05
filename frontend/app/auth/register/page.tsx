"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../components/Toast";

const ROLES = [
  { value:"USER", label:"Individual", icon:"👤" },
  { value:"AGENT", label:"Agent", icon:"🤝" },
  { value:"COMPANY", label:"Company", icon:"🏢" },
  { value:"ORGANIZATION", label:"Organization", icon:"🏛️" },
];

export default function RegisterPage() {
  const { register } = useAuth(); const router = useRouter(); const toast = useToast();
  const [form, setForm] = useState({ name:"", email:"", password:"", role:"USER", organizationName:"", country:"Uganda", city:"" });
  const [loading, setLoading] = useState(false);
  function u(k: string, v: string) { setForm(f => ({...f,[k]:v})); }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    try { await register(form); toast.success("Welcome to yotweek! 🎉"); router.push("/"); }
    catch (err: any) { toast.error(err?.response?.data?.error || "Could not create account."); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-10 animate-fade-in bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50">
      <div className="w-full max-w-md">
        <div className="card-base p-8 sm:p-10">
          <div className="text-center mb-7">
            <Link href="/" className="inline-flex items-center gap-2 mb-4 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-600 to-indigo-600 flex items-center justify-center font-black text-white shadow-glow">YW</div>
              <span className="font-extrabold text-xl text-gray-900">yot<span className="font-serif italic text-sky-600">week</span></span>
            </Link>
            <h1 className="font-extrabold text-2xl text-gray-900">Create your account</h1>
            <p className="text-gray-400 text-sm mt-1">Join to discover and list events & businesses</p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">Full name</label>
              <input required value={form.name} onChange={e => u("name",e.target.value)} className="input-base" placeholder="Your name" /></div>
            <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
              <input required type="email" value={form.email} onChange={e => u("email",e.target.value)} className="input-base" placeholder="you@example.com" /></div>
            <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">Password <span className="text-gray-400 font-normal">(min 8 chars)</span></label>
              <input required type="password" minLength={8} value={form.password} onChange={e => u("password",e.target.value)} className="input-base" placeholder="••••••••" /></div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Account type</label>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map(r => (
                  <button key={r.value} type="button" onClick={() => u("role",r.value)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-xs font-semibold transition-all ${form.role===r.value?"border-sky-500 bg-sky-50 text-sky-700":"border-gray-200 text-gray-600 hover:border-sky-200"}`}>
                    <span style={{fontSize:"1.3rem"}}>{r.icon}</span>{r.label}
                  </button>
                ))}
              </div>
            </div>
            {form.role !== "USER" && (
              <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">Organization name <span className="text-red-500">*</span></label>
                <input required value={form.organizationName} onChange={e => u("organizationName",e.target.value)} className="input-base" placeholder="Your organization" /></div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">City</label><input value={form.city} onChange={e => u("city",e.target.value)} className="input-base" placeholder="Gulu" /></div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">Country</label><input value={form.country} onChange={e => u("country",e.target.value)} className="input-base" /></div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full !py-3 !rounded-xl !justify-center !text-base mt-2">{loading?"Creating account…":"Create account"}</button>
          </form>
          <p className="text-center text-sm text-gray-400 mt-5">Already have an account? <Link href="/auth/login" className="text-sky-600 font-semibold underline underline-offset-2">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
}
