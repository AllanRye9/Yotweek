"use client";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { api } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../components/Toast";
import { AdminGuard } from "../../../components/AdminGuard";
import { GalleryThumb } from "../../../components/GalleryThumb";

const EDIT_EMPTY = { name: "", description: "", priceRange: "" };

export default function AdminBusinessesPage() {
  const { user } = useAuth(); const toast = useToast();
  const [businesses, setBusinesses] = useState<any[]>([]); const [fetching, setFetching] = useState(true);
  const [tab, setTab] = useState<"pending"|"flagged"|"all">("pending");
  const [q, setQ] = useState("");
  const [editingId, setEditingId] = useState<string|null>(null);
  const [editForm, setEditForm] = useState(EDIT_EMPTY);

  function load(t: "pending"|"flagged"|"all") {
    setFetching(true);
    const url = t === "flagged" ? "/admin/businesses/flagged" : t === "all" ? "/admin/businesses/all" : "/admin/businesses/pending";
    api.get(url, t === "all" && q ? { params: { q } } : undefined).then(r=>setBusinesses(r.data.businesses)).finally(()=>setFetching(false));
  }
  useEffect(() => { if (user?.role==="ADMIN") load(tab); }, [user,tab]); // eslint-disable-line react-hooks/exhaustive-deps

  async function approve(id: string) {
    try { await api.post(`/admin/businesses/${id}/approve`); toast.success("Approved!"); load(tab); }
    catch (err: any) { toast.error(err?.response?.data?.error || "Could not approve — it may no longer exist."); load(tab); }
  }
  async function reject(id: string) {
    const r=prompt("Reason?")||"Did not meet guidelines";
    try { await api.post(`/admin/businesses/${id}/reject`,{reason:r}); toast.info("Rejected."); load(tab); }
    catch (err: any) { toast.error(err?.response?.data?.error || "Could not reject — it may no longer exist."); load(tab); }
  }
  async function hide(id: string) {
    try { await api.post(`/admin/businesses/${id}/hide`); toast.warning("Hidden."); load(tab); }
    catch (err: any) { toast.error(err?.response?.data?.error || "Could not hide — it may no longer exist."); load(tab); }
  }
  async function remove(id: string) {
    if (!confirm("Permanently delete this business? This can't be undone.")) return;
    try { await api.delete(`/admin/businesses/${id}`); toast.warning("Deleted."); load(tab); }
    catch (err: any) { toast.error(err?.response?.data?.error || "Could not delete business."); }
  }
  function startEdit(b: any) {
    setEditingId(b.id);
    setEditForm({ name: b.name, description: b.description, priceRange: b.priceRange || "" });
  }
  async function saveEdit(id: string) {
    try {
      await api.put(`/admin/businesses/${id}`, { name: editForm.name, description: editForm.description, priceRange: editForm.priceRange || null });
      toast.success("Business updated.");
      setEditingId(null);
      load(tab);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Could not save changes — this business may no longer exist.");
      load(tab);
    }
  }

  return (
    <AdminGuard>
    <div className="animate-fade-in">
      <div className="bg-gradient-to-r from-violet-700 to-indigo-700 text-white px-6 sm:px-9 py-11"><div className="max-w-7xl mx-auto"><h1 className="font-extrabold text-2xl">Business Management</h1><p className="text-white/70 text-sm mt-1">Review new submissions, or edit/remove any listing.</p></div></div>
      <div className="max-w-7xl mx-auto px-6 sm:px-9 py-9">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex gap-2">
            {(["pending","flagged","all"] as const).map(t => <button key={t} onClick={() => setTab(t)} className={tab===t?"tab-pill-active":"tab-pill-inactive"}>{t==="pending"?"⏳ Pending":t==="flagged"?"⚠️ Flagged":"📋 All businesses"}</button>)}
          </div>
          {tab==="all" && (
            <form onSubmit={e => { e.preventDefault(); load("all"); }} className="flex gap-2">
              <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search name…" className="input-base !py-1.5 !text-sm !w-56" />
              <button type="submit" className="btn-secondary !px-4 !py-1.5 !text-sm">Search</button>
            </form>
          )}
        </div>
        {fetching ? <p className="text-gray-400 text-sm">Loading…</p>
        : businesses.length===0 ? <div className="card-base p-12 text-center"><p className="text-4xl mb-3">🎉</p><p className="font-semibold text-gray-700">{tab==="all"?"No businesses match.":"Queue is empty!"}</p></div>
        : <div className="space-y-4">{businesses.map(b => (
            <div key={b.id} className="card-base p-5">
              <div className="flex flex-wrap items-start gap-4">
                <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
                  {b.coverImageUrl ? (
                    <GalleryThumb url={b.coverImageUrl} alt={b.name} className="w-full h-full object-cover" fallbackIcon="🏪" />
                  ) : (
                    <span className="text-3xl text-gray-300">🏪</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {editingId === b.id ? (
                    <div className="space-y-2 mb-2">
                      <input value={editForm.name} onChange={ev=>setEditForm(f=>({...f,name:ev.target.value}))} className="input-base !py-1.5 !text-sm" placeholder="Name" />
                      <textarea value={editForm.description} onChange={ev=>setEditForm(f=>({...f,description:ev.target.value}))} className="textarea-base !py-1.5 !text-sm" rows={2} placeholder="Description" />
                      <select value={editForm.priceRange} onChange={ev=>setEditForm(f=>({...f,priceRange:ev.target.value}))} className="select-base !py-1.5 !text-sm !w-40">
                        <option value="">No price range</option>
                        <option value="BUDGET">Budget</option>
                        <option value="MODERATE">Moderate</option>
                        <option value="EXPENSIVE">Expensive</option>
                        <option value="LUXURY">Luxury</option>
                      </select>
                      <div className="flex gap-2">
                        <button onClick={() => saveEdit(b.id)} className="btn-primary !px-4 !py-1.5 !text-xs">Save</button>
                        <button onClick={() => setEditingId(null)} className="btn-ghost !px-4 !py-1.5 !text-xs">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h2 className="font-extrabold text-gray-900">{b.name}</h2>
                        {b.category && <span className="badge bg-sky-50 text-sky-700">{b.category.name}</span>}
                        {b.status && <span className="badge bg-gray-100 text-gray-600">{b.status}</span>}
                        {b.isFlagged && <span className="badge bg-red-100 text-red-700">⚠️ Flagged</span>}
                        {b.reportCount>0 && <span className="badge bg-rose-100 text-rose-700">🚩 {b.reportCount} reports</span>}
                      </div>
                      <p className="text-sm text-gray-400 mb-1">{b.city}, {b.country}{b.createdAt ? ` · listed ${format(new Date(b.createdAt),"d MMM yyyy")}` : ""}</p>
                      <p className="text-xs text-gray-300 mb-2">By {b.owner?.organizationName||b.owner?.name}{b.owner?.role?` · ${b.owner.role}`:""}{b.owner?.isVerifiedOrganizer?" · ✓ verified":""}</p>
                      {b.isFlagged && b.flagReason && <p className="text-xs text-red-500 bg-red-50 px-3 py-1.5 rounded-lg mb-2">⚠️ {b.flagReason}</p>}
                      {b.description && <p className="text-sm text-gray-500 line-clamp-2 mb-2">{b.description}</p>}
                    </>
                  )}
                  {b.galleryUrls?.length > 0 && (
                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                      {b.galleryUrls.map((url: string, i: number) => (
                        <GalleryThumb key={i} url={url} alt={`${b.name} gallery ${i+1}`} className="w-14 h-14 shrink-0 rounded-lg object-cover ring-1 ring-gray-200" />
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 flex-col gap-2">
                  {tab !== "all" ? (
                    <>
                      <button onClick={() => approve(b.id)} className="btn-primary !px-4 !py-1.5 !text-xs">✓ Approve</button>
                      <button onClick={() => reject(b.id)} className="btn-danger !px-4 !py-1.5 !text-xs">✕ Reject</button>
                      <button onClick={() => hide(b.id)} className="btn-ghost !px-4 !py-1.5 !text-xs">🚫 Hide</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEdit(b)} className="btn-secondary !px-4 !py-1.5 !text-xs">✎ Edit</button>
                      <button onClick={() => hide(b.id)} className="btn-ghost !px-4 !py-1.5 !text-xs">🚫 Hide</button>
                      <button onClick={() => remove(b.id)} className="btn-danger !px-4 !py-1.5 !text-xs">🗑 Delete</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}</div>}
      </div>
    </div>
    </AdminGuard>
  );
}
