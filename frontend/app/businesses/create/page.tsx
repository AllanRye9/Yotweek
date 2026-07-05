"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../components/Toast";

const INIT = { name:"",description:"",city:"",country:"Uganda",address:"",phone:"",email:"",website:"",priceRange:"MODERATE",latitude:"",longitude:"",tags:"" };

export default function CreateBusinessPage() {
  const { user, loading } = useAuth(); const router = useRouter(); const toast = useToast();
  const [form, setForm] = useState(INIT); const [submitting, setSubmitting] = useState(false);
  function u(k: string, v: string) { setForm(f => ({...f,[k]:v})); }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSubmitting(true);
    try {
      const payload: any = { ...form, latitude:form.latitude?parseFloat(form.latitude):undefined, longitude:form.longitude?parseFloat(form.longitude):undefined, tags:form.tags.split(",").map(s=>s.trim().toLowerCase()).filter(Boolean) };
      await api.post("/businesses", payload);
      toast.success("Submitted for review!"); router.push("/dashboard");
    } catch (err: any) { toast.error(err?.response?.data?.error || "Could not submit."); }
    finally { setSubmitting(false); }
  }

  if (loading) return null;
  if (!user) return <div className="min-h-[60vh] flex items-center justify-center"><div className="card-base p-10 text-center max-w-md"><p style={{fontSize:"3rem"}} className="mb-4">🏪</p><h1 className="font-extrabold text-2xl mb-4">Sign in to list a business</h1><Link href="/auth/login" className="btn-primary !px-8 !py-3 inline-flex">Sign in</Link></div></div>;

  return (
    <div className="animate-fade-in">
      <div className="page-header"><div className="max-w-2xl mx-auto"><h1 className="font-extrabold text-2xl sm:text-3xl mb-1">List a business</h1><p className="text-white/70 text-sm">Reviewed by our team before going live.</p></div></div>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <form onSubmit={submit} className="card-base p-6 space-y-5">
          {[
            { label:"Business name", key:"name", required:true, placeholder:"e.g. Acholi Inn" },
            { label:"Description", key:"description", textarea:true, placeholder:"What does your business offer?" },
            { label:"City", key:"city", required:true, placeholder:"Gulu" },
            { label:"Country", key:"country", required:true },
            { label:"Address", key:"address" },
            { label:"Phone", key:"phone" },
            { label:"Email", key:"email" },
            { label:"Website", key:"website" },
          ].map((f: any) => (
            <label key={f.key} className="block">
              <span className="block text-sm font-semibold text-gray-700 mb-1.5">{f.label}{f.required && <span className="text-red-500 ml-0.5">*</span>}</span>
              {f.textarea ? <textarea rows={4} value={(form as any)[f.key]} onChange={e=>u(f.key,e.target.value)} className="input-base" placeholder={f.placeholder} />
              : <input value={(form as any)[f.key]} onChange={e=>u(f.key,e.target.value)} className="input-base" placeholder={f.placeholder} required={f.required} />}
            </label>
          ))}
          <label className="block">
            <span className="block text-sm font-semibold text-gray-700 mb-1.5">Price range</span>
            <select value={form.priceRange} onChange={e=>u("priceRange",e.target.value)} className="input-base">
              <option value="BUDGET">$ Budget</option><option value="MODERATE">$$ Moderate</option><option value="EXPENSIVE">$$$ Expensive</option><option value="LUXURY">$$$$ Luxury</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block"><span className="block text-sm font-semibold text-gray-700 mb-1.5">Latitude</span><input type="number" step="any" value={form.latitude} onChange={e=>u("latitude",e.target.value)} className="input-base" /></label>
            <label className="block"><span className="block text-sm font-semibold text-gray-700 mb-1.5">Longitude</span><input type="number" step="any" value={form.longitude} onChange={e=>u("longitude",e.target.value)} className="input-base" /></label>
          </div>
          <label className="block"><span className="block text-sm font-semibold text-gray-700 mb-1.5">Tags <span className="text-gray-400 font-normal">(comma-separated)</span></span><input value={form.tags} onChange={e=>u("tags",e.target.value)} className="input-base" placeholder="restaurant, outdoor, wifi" /></label>
          <button type="submit" disabled={submitting} className="btn-primary w-full !py-3 !rounded-xl !justify-center">{submitting?"Submitting…":"Submit for review"}</button>
        </form>
      </div>
    </div>
  );
}
