"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../components/Toast";
import { ImageUrlInput } from "../../../components/ImageUrlInput";
import { LogoUploadInput } from "../../../components/LogoUploadInput";
import { Category } from "../../../lib/types";

const INIT = { name:"",description:"",categoryId:"",city:"",country:"Uganda",address:"",phone:"",email:"",website:"",priceRange:"MODERATE",latitude:"",longitude:"",tags:"",coverImageUrl:"",logoUrl:"" };

function flattenCategories(cats: Category[], depth = 0): { id: string; label: string }[] {
  return cats.flatMap(c => [
    { id: c.id, label: `${"— ".repeat(depth)}${c.name}` },
    ...flattenCategories(c.children || [], depth + 1),
  ]);
}

export default function CreateBusinessPage() {
  const { user, loading } = useAuth(); const router = useRouter(); const toast = useToast();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const [form, setForm] = useState(INIT); const [submitting, setSubmitting] = useState(false);
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(!!editId);
  function u(k: string, v: string) { setForm(f => ({...f,[k]:v})); }

  useEffect(() => {
    api.get("/categories").then(r => setCategories(r.data.categories || r.data)).catch(() => {});
  }, []);
  const flatCategories = flattenCategories(categories);

  useEffect(() => {
    if (!editId) return;
    api.get(`/businesses/${editId}`).then(r => {
      const b = r.data.business;
      setForm({
        name: b.name, description: b.description || "", categoryId: b.category?.id || b.categoryId || "",
        city: b.city || "", country: b.country || "Uganda", address: b.address || "", phone: b.phone || "",
        email: b.email || "", website: b.website || "", priceRange: b.priceRange || "MODERATE",
        latitude: b.latitude != null ? String(b.latitude) : "", longitude: b.longitude != null ? String(b.longitude) : "",
        tags: (b.tags || []).join(","), coverImageUrl: b.coverImageUrl || "", logoUrl: b.logoUrl || "",
      });
      setGalleryUrls(b.galleryUrls || []);
    }).catch(() => toast.error("Could not load this business.")).finally(() => setLoadingExisting(false));
  }, [editId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.categoryId) { toast.error("Please choose a category."); return; }
    setSubmitting(true);
    try {
      const payload: any = { ...form,
        latitude:form.latitude?parseFloat(form.latitude):undefined,
        longitude:form.longitude?parseFloat(form.longitude):undefined,
        tags:form.tags.split(",").map(s=>s.trim().toLowerCase()).filter(Boolean),
        coverImageUrl: form.coverImageUrl.trim() || undefined,
        logoUrl: form.logoUrl.trim() || undefined,
        galleryUrls,
      };
      if (editId) {
        await api.put(`/businesses/${editId}`, payload);
        toast.success("Business updated.");
        router.push(user?.role === "ADMIN" ? "/const/businesses" : "/dashboard?tab=businesses");
      } else {
        await api.post("/businesses", payload);
        toast.success("Submitted for review!"); router.push("/dashboard?tab=businesses");
      }
    } catch (err: any) { toast.error(err?.response?.data?.error || err?.response?.data?.errors?.[0]?.msg || "Could not submit."); }
    finally { setSubmitting(false); }
  }

  if (loading || loadingExisting) return <div className="max-w-2xl mx-auto px-[10%] py-16 text-center text-gray-400">Loading…</div>;
  if (!user) return <div className="min-h-[60vh] flex items-center justify-center"><div className="card-base p-10 text-center max-w-md"><p style={{fontSize:"3rem"}} className="mb-4">🏪</p><h1 className="font-extrabold text-2xl mb-4">Sign in to list a business</h1><Link href="/auth/login" className="btn-primary !px-8 !py-3 inline-flex">Sign in</Link></div></div>;

  return (
    <div className="animate-fade-in">
      <div className="page-header"><div className="max-w-2xl mx-auto"><h1 className="font-extrabold text-2xl sm:text-3xl mb-1">{editId ? "Edit business" : "List a business"}</h1><p className="text-white/70 text-sm">{editId ? "Update your business's details and photos." : "Reviewed by our team before going live."}</p></div></div>
      <div className="max-w-2xl mx-auto px-[10%] py-9">
        {editId && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-700 flex gap-2 mb-5">
            <span>⚠️</span><p>Changes to a live listing go back for admin re-approval before showing publicly again.</p>
          </div>
        )}
        <form onSubmit={submit} className="card-base p-6 space-y-5">
          {[
            { label:"Business name", key:"name", required:true, placeholder:"e.g. Acholi Inn" },
            { label:"Description", key:"description", textarea:true, placeholder:"What does your business offer?" },
          ].map((f: any) => (
            <label key={f.key} className="block">
              <span className="block text-sm font-semibold text-gray-700 mb-1.5">{f.label}{f.required && <span className="text-red-500 ml-0.5">*</span>}</span>
              {f.textarea ? <textarea rows={4} value={(form as any)[f.key]} onChange={e=>u(f.key,e.target.value)} className="textarea-base" placeholder={f.placeholder} />
              : <input value={(form as any)[f.key]} onChange={e=>u(f.key,e.target.value)} className="input-base" placeholder={f.placeholder} required={f.required} />}
            </label>
          ))}
          <label className="block">
            <span className="block text-sm font-semibold text-gray-700 mb-1.5">Category<span className="text-red-500 ml-0.5">*</span></span>
            <select required value={form.categoryId} onChange={e=>u("categoryId",e.target.value)} className="select-base">
              <option value="">Select a category…</option>
              {flatCategories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </label>
          {[
            { label:"City", key:"city", required:true, placeholder:"Gulu" },
            { label:"Country", key:"country", required:true },
            { label:"Address", key:"address" },
            { label:"Phone", key:"phone" },
            { label:"Email", key:"email" },
            { label:"Website", key:"website" },
          ].map((f: any) => (
            <label key={f.key} className="block">
              <span className="block text-sm font-semibold text-gray-700 mb-1.5">{f.label}{f.required && <span className="text-red-500 ml-0.5">*</span>}</span>
              {f.textarea ? <textarea rows={4} value={(form as any)[f.key]} onChange={e=>u(f.key,e.target.value)} className="textarea-base" placeholder={f.placeholder} />
              : <input value={(form as any)[f.key]} onChange={e=>u(f.key,e.target.value)} className="input-base" placeholder={f.placeholder} required={f.required} />}
            </label>
          ))}
          <label className="block">
            <span className="block text-sm font-semibold text-gray-700 mb-1.5">Price range</span>
            <select value={form.priceRange} onChange={e=>u("priceRange",e.target.value)} className="select-base">
              <option value="BUDGET">$ Budget</option><option value="MODERATE">$$ Moderate</option><option value="EXPENSIVE">$$$ Expensive</option><option value="LUXURY">$$$$ Luxury</option>
            </select>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block"><span className="block text-sm font-semibold text-gray-700 mb-1.5">Latitude</span><input type="number" step="any" value={form.latitude} onChange={e=>u("latitude",e.target.value)} className="input-base" /></label>
            <label className="block"><span className="block text-sm font-semibold text-gray-700 mb-1.5">Longitude</span><input type="number" step="any" value={form.longitude} onChange={e=>u("longitude",e.target.value)} className="input-base" /></label>
          </div>
          <label className="block"><span className="block text-sm font-semibold text-gray-700 mb-1.5">Tags <span className="text-gray-400 font-normal">(comma-separated)</span></span><input value={form.tags} onChange={e=>u("tags",e.target.value)} className="input-base" placeholder="restaurant, outdoor, wifi" /></label>
          <div className="pt-1 border-t border-gray-100">
            <p className="text-sm font-bold text-gray-900 mb-3 mt-4">🏷️ Logo</p>
            <LogoUploadInput logoUrl={form.logoUrl} onChange={v => u("logoUrl", v)} />
          </div>
          <div className="pt-1 border-t border-gray-100">
            <p className="text-sm font-bold text-gray-900 mb-3 mt-4">📸 Photos</p>
            <ImageUrlInput
              coverImageUrl={form.coverImageUrl}
              onCoverChange={v => u("coverImageUrl", v)}
              galleryUrls={galleryUrls}
              onGalleryChange={setGalleryUrls}
            />
          </div>
          <button type="submit" disabled={submitting} className="btn-primary w-full !py-3 !rounded-xl !justify-center">{submitting ? "Saving…" : editId ? "Save changes" : "Submit for review"}</button>
        </form>
      </div>
    </div>
  );
}
