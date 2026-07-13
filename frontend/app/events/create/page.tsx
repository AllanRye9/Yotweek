"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../components/Toast";
import { ImageUrlInput } from "../../../components/ImageUrlInput";

const CATS = ["FESTIVAL","CONFERENCE","CONCERT","SPORTS","CULTURAL_HERITAGE","NIGHTLIFE",
  "WORKSHOP","GUIDED_TOUR","ADVENTURE_OUTDOOR","WILDLIFE_SAFARI","FOOD_DRINK","RELIGIOUS","EXHIBITION","OTHER"];
const INIT = { title:"",description:"",category:"FESTIVAL",scope:"LOCAL",priceType:"FREE",
  price:"",currency:"UGX",startDate:"",endDate:"",venueName:"",address:"",city:"",country:"Uganda",
  latitude:"",longitude:"",capacity:"",languages:"en",tags:"",coverImageUrl:"" };

function Field({ label,required,hint,children }: { label:string;required?:boolean;hint?:string;children:React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-gray-700 mb-1.5">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</span>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </label>
  );
}

export default function CreateEventPage() {
  const { user, loading } = useAuth(); const router = useRouter(); const toast = useToast();
  const [form, setForm] = useState(INIT); const [submitting, setSubmitting] = useState(false); const [step, setStep] = useState(1);
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  function u(k: string, v: string) { setForm(f => ({...f,[k]:v})); }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSubmitting(true);
    try {
      const payload: any = { ...form,
        price: form.priceType==="PAID" ? parseFloat(form.price) : undefined,
        latitude: form.latitude ? parseFloat(form.latitude) : undefined,
        longitude: form.longitude ? parseFloat(form.longitude) : undefined,
        capacity: form.capacity ? parseInt(form.capacity,10) : undefined,
        languages: form.languages.split(",").map(s=>s.trim()).filter(Boolean),
        tags: form.tags.split(",").map(s=>s.trim().toLowerCase()).filter(Boolean),
        coverImageUrl: form.coverImageUrl.trim() || undefined,
        galleryUrls,
      };
      await api.post("/events", payload);
      toast.success("Submitted for review! You'll be notified when approved."); router.push("/dashboard");
    } catch (err: any) { toast.error(err?.response?.data?.error || err?.response?.data?.errors?.[0]?.msg || "Could not submit."); }
    finally { setSubmitting(false); }
  }

  if (loading) return <div className="max-w-2xl mx-auto px-4 py-16 text-center text-gray-400">Loading…</div>;
  if (!user) return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="card-base p-10 text-center max-w-md">
        <p style={{fontSize:"3rem"}} className="mb-4">🎪</p>
        <h1 className="font-extrabold text-2xl text-gray-900 mb-2">Sign in to list an event</h1>
        <Link href="/auth/login" className="btn-primary !px-8 !py-3 !rounded-xl mt-4 inline-flex">Sign in</Link>
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-extrabold text-2xl sm:text-3xl mb-1">List an event</h1>
          <p className="text-white/70 text-sm">All submissions are reviewed by our team before going live.</p>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-6 sm:px-9 py-12">
        <div className="flex gap-2 mb-8">
          {[{n:1,label:"Event details"},{n:2,label:"Location & extras"}].map(s => (
            <button key={s.n} type="button" onClick={() => setStep(s.n)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all border ${step===s.n?"bg-sky-600 text-white border-sky-600 shadow-glow":"bg-white text-gray-500 border-gray-200 hover:border-sky-200"}`}>
              {s.n}. {s.label}
            </button>
          ))}
        </div>
        <form onSubmit={submit} className="space-y-5">
          {step===1 && (
            <div className="card-base p-6 space-y-5 animate-fade-up">
              <Field label="Title" required><input required value={form.title} onChange={e=>u("title",e.target.value)} className="input-base" placeholder="e.g. Gulu Cultural Festival 2026" /></Field>
              <Field label="Description" required hint="Describe what attendees can expect."><textarea required rows={5} value={form.description} onChange={e=>u("description",e.target.value)} className="textarea-base" placeholder="Tell people about this event…" /></Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Category" required><select value={form.category} onChange={e=>u("category",e.target.value)} className="select-base">{CATS.map(c=><option key={c} value={c}>{c.replace(/_/g," ")}</option>)}</select></Field>
                <Field label="Scope" required><select value={form.scope} onChange={e=>u("scope",e.target.value)} className="select-base"><option value="LOCAL">📍 Local</option><option value="INTERNATIONAL">🌍 International</option></select></Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Pricing" required><select value={form.priceType} onChange={e=>u("priceType",e.target.value)} className="select-base"><option value="FREE">🆓 Free</option><option value="PAID">🎫 Paid</option></select></Field>
                {form.priceType==="PAID" && <Field label={`Price (${form.currency})`} required><input required type="number" min="0" step="0.01" value={form.price} onChange={e=>u("price",e.target.value)} className="input-base" /></Field>}
              </div>
              {form.priceType==="PAID" && <Field label="Currency"><select value={form.currency} onChange={e=>u("currency",e.target.value)} className="select-base">{["UGX","KES","USD","AED","GBP","EUR"].map(c=><option key={c}>{c}</option>)}</select></Field>}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Start date & time" required><input required type="datetime-local" value={form.startDate} onChange={e=>u("startDate",e.target.value)} className="input-base" /></Field>
                <Field label="End date (optional)"><input type="datetime-local" value={form.endDate} onChange={e=>u("endDate",e.target.value)} className="input-base" /></Field>
              </div>
              <button type="button" onClick={() => setStep(2)} className="btn-primary w-full !py-3 !rounded-xl !justify-center">Next: Location & extras →</button>
            </div>
          )}
          {step===2 && (
            <div className="card-base p-6 space-y-5 animate-fade-up">
              <Field label="Venue name"><input value={form.venueName} onChange={e=>u("venueName",e.target.value)} className="input-base" placeholder="e.g. Pece Stadium" /></Field>
              <Field label="Address"><input value={form.address} onChange={e=>u("address",e.target.value)} className="input-base" /></Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="City" required><input required value={form.city} onChange={e=>u("city",e.target.value)} className="input-base" placeholder="Gulu" /></Field>
                <Field label="Country" required><input required value={form.country} onChange={e=>u("country",e.target.value)} className="input-base" /></Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Latitude" hint="Enables map & weather"><input type="number" step="any" value={form.latitude} onChange={e=>u("latitude",e.target.value)} className="input-base" placeholder="2.7746" /></Field>
                <Field label="Longitude"><input type="number" step="any" value={form.longitude} onChange={e=>u("longitude",e.target.value)} className="input-base" placeholder="32.2989" /></Field>
              </div>
              <Field label="Capacity" hint="Leave blank for unlimited"><input type="number" min="1" value={form.capacity} onChange={e=>u("capacity",e.target.value)} className="input-base" placeholder="500" /></Field>
              <Field label="Languages" hint="Comma-separated, e.g. en, sw, ach"><input value={form.languages} onChange={e=>u("languages",e.target.value)} className="input-base" /></Field>
              <Field label="Tags" hint="Comma-separated — helps recommendations"><input value={form.tags} onChange={e=>u("tags",e.target.value)} className="input-base" placeholder="family-friendly, outdoor, music" /></Field>
              <div className="pt-1 border-t border-gray-100">
                <p className="text-sm font-bold text-gray-900 mb-3 mt-4">📸 Photos</p>
                <ImageUrlInput
                  coverImageUrl={form.coverImageUrl}
                  onCoverChange={v => u("coverImageUrl", v)}
                  galleryUrls={galleryUrls}
                  onGalleryChange={setGalleryUrls}
                />
              </div>
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-700 flex gap-2">
                <span>⚠️</span><p>Your listing will be reviewed before going live. You'll receive a notification once approved.</p>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)} className="btn-secondary !px-5">← Back</button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1 !py-3 !rounded-xl !justify-center">{submitting?"Submitting…":"Submit for review"}</button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
