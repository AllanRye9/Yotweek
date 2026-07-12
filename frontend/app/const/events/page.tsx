"use client";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { api } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../components/Toast";
import { AdminGuard } from "../../../components/AdminGuard";
import { GalleryThumb } from "../../../components/GalleryThumb";

const EDIT_EMPTY = { title: "", description: "", price: "", capacity: "" };

export default function AdminEventsPage() {
  const { user } = useAuth(); const toast = useToast();
  const [events, setEvents] = useState<any[]>([]); const [fetching, setFetching] = useState(true);
  const [tab, setTab] = useState<"pending"|"flagged"|"all">("pending");
  const [q, setQ] = useState("");
  const [editingId, setEditingId] = useState<string|null>(null);
  const [editForm, setEditForm] = useState(EDIT_EMPTY);

  function load(t: "pending"|"flagged"|"all") {
    setFetching(true);
    const url = t === "flagged" ? "/admin/events/flagged" : t === "all" ? "/admin/events/all" : "/admin/events/pending";
    api.get(url, t === "all" && q ? { params: { q } } : undefined).then(r=>setEvents(r.data.events)).finally(()=>setFetching(false));
  }
  useEffect(() => { if (user?.role==="ADMIN") load(tab); }, [user,tab]); // eslint-disable-line react-hooks/exhaustive-deps

  async function approve(id: string) { await api.post(`/admin/events/${id}/approve`); toast.success("Approved!"); load(tab); }
  async function reject(id: string) { const r=prompt("Reason?")||"Did not meet guidelines"; await api.post(`/admin/events/${id}/reject`,{reason:r}); toast.info("Rejected."); load(tab); }
  async function hide(id: string) { await api.post(`/admin/events/${id}/hide`); toast.warning("Hidden."); load(tab); }
  async function toggleFeature(e: any) { await api.put(`/admin/events/${e.id}`, { isFeatured: !e.isFeatured }); toast.success(e.isFeatured ? "Unfeatured." : "Featured! ⭐"); load(tab); }
  async function remove(id: string) {
    if (!confirm("Permanently delete this listing? This can't be undone.")) return;
    try { await api.delete(`/admin/events/${id}`); toast.warning("Deleted."); load(tab); }
    catch (err: any) { toast.error(err?.response?.data?.error || "Could not delete listing."); }
  }
  function startEdit(e: any) {
    setEditingId(e.id);
    setEditForm({ title: e.title, description: e.description, price: e.price ?? "", capacity: e.capacity ?? "" });
  }
  async function saveEdit(id: string) {
    await api.put(`/admin/events/${id}`, {
      title: editForm.title, description: editForm.description,
      price: editForm.price === "" ? null : Number(editForm.price),
      capacity: editForm.capacity === "" ? null : Number(editForm.capacity),
    });
    toast.success("Listing updated.");
    setEditingId(null);
    load(tab);
  }

  return (
    <AdminGuard>
    <div className="animate-fade-in">
      <div className="bg-gradient-to-r from-violet-700 to-indigo-700 text-white px-6 sm:px-9 py-11"><div className="max-w-7xl mx-auto"><h1 className="font-extrabold text-2xl">Event Management</h1><p className="text-white/70 text-sm mt-1">Review new submissions, or edit/feature/remove any listing.</p></div></div>
      <div className="max-w-7xl mx-auto px-6 sm:px-9 py-9">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex gap-2">
            {(["pending","flagged","all"] as const).map(t => <button key={t} onClick={() => setTab(t)} className={tab===t?"tab-pill-active":"tab-pill-inactive"}>{t==="pending"?"⏳ Pending":t==="flagged"?"⚠️ Flagged":"📋 All events"}</button>)}
          </div>
          {tab==="all" && (
            <form onSubmit={e => { e.preventDefault(); load("all"); }} className="flex gap-2">
              <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search title…" className="input-base !py-1.5 !text-sm !w-56" />
              <button type="submit" className="btn-secondary !px-4 !py-1.5 !text-sm">Search</button>
            </form>
          )}
        </div>
        {fetching ? <p className="text-gray-400 text-sm">Loading…</p>
        : events.length===0 ? <div className="card-base p-12 text-center"><p className="text-4xl mb-3">🎉</p><p className="font-semibold text-gray-700">{tab==="all"?"No events match.":"Queue is empty!"}</p></div>
        : <div className="space-y-4">{events.map(e => (
            <div key={e.id} className="card-base p-5">
              <div className="flex flex-wrap items-start gap-4">
                <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
                  {e.coverImageUrl ? (
                    <GalleryThumb url={e.coverImageUrl} alt={e.title} className="w-full h-full object-cover" fallbackIcon="🎪" />
                  ) : (
                    <span className="text-3xl text-gray-300">🎪</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {editingId === e.id ? (
                    <div className="space-y-2 mb-2">
                      <input value={editForm.title} onChange={ev=>setEditForm(f=>({...f,title:ev.target.value}))} className="input-base !py-1.5 !text-sm" placeholder="Title" />
                      <textarea value={editForm.description} onChange={ev=>setEditForm(f=>({...f,description:ev.target.value}))} className="input-base !py-1.5 !text-sm" rows={2} placeholder="Description" />
                      <div className="flex gap-2">
                        <input value={editForm.price} onChange={ev=>setEditForm(f=>({...f,price:ev.target.value}))} type="number" className="input-base !py-1.5 !text-sm !w-32" placeholder="Price" />
                        <input value={editForm.capacity} onChange={ev=>setEditForm(f=>({...f,capacity:ev.target.value}))} type="number" className="input-base !py-1.5 !text-sm !w-32" placeholder="Capacity" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => saveEdit(e.id)} className="btn-primary !px-4 !py-1.5 !text-xs">Save</button>
                        <button onClick={() => setEditingId(null)} className="btn-ghost !px-4 !py-1.5 !text-xs">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h2 className="font-extrabold text-gray-900">{e.title}</h2>
                        {e.isFeatured && <span className="badge bg-amber-100 text-amber-700">⭐ Featured</span>}
                        {e.status && <span className="badge bg-gray-100 text-gray-600">{e.status}</span>}
                        {e.isFlagged && <span className="badge bg-red-100 text-red-700">⚠️ Flagged</span>}
                        {e.reportCount>0 && <span className="badge bg-rose-100 text-rose-700">🚩 {e.reportCount} reports</span>}
                      </div>
                      <p className="text-sm text-gray-400 mb-1">{e.city}, {e.country} · {format(new Date(e.startDate),"d MMM yyyy")} · <strong>{e.priceType}</strong>{e.priceType==="PAID"?` (${e.currency} ${Number(e.price).toLocaleString()})`:""}</p>
                      <p className="text-xs text-gray-300 mb-2">By {e.organizer?.organizationName||e.organizer?.name}{e.organizer?.role?` · ${e.organizer.role}`:""}{e.organizer?.isVerifiedOrganizer?" · ✓ verified":""}</p>
                      {e.isFlagged && e.flagReason && <p className="text-xs text-red-500 bg-red-50 px-3 py-1.5 rounded-lg mb-2">⚠️ {e.flagReason}</p>}
                      <p className="text-sm text-gray-500 line-clamp-2 mb-2">{e.description}</p>
                    </>
                  )}
                  {e.galleryUrls?.length > 0 && (
                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                      {e.galleryUrls.map((url: string, i: number) => (
                        <GalleryThumb key={i} url={url} alt={`${e.title} gallery ${i+1}`} className="w-14 h-14 shrink-0 rounded-lg object-cover ring-1 ring-gray-200" />
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 flex-col gap-2">
                  {tab !== "all" ? (
                    <>
                      <button onClick={() => approve(e.id)} className="btn-primary !px-4 !py-1.5 !text-xs">✓ Approve</button>
                      <button onClick={() => reject(e.id)} className="btn-danger !px-4 !py-1.5 !text-xs">✕ Reject</button>
                      <button onClick={() => hide(e.id)} className="btn-ghost !px-4 !py-1.5 !text-xs">🚫 Hide</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => toggleFeature(e)} className="btn-secondary !px-4 !py-1.5 !text-xs">{e.isFeatured?"☆ Unfeature":"⭐ Feature"}</button>
                      <button onClick={() => startEdit(e)} className="btn-secondary !px-4 !py-1.5 !text-xs">✎ Edit</button>
                      <button onClick={() => hide(e.id)} className="btn-ghost !px-4 !py-1.5 !text-xs">🚫 Hide</button>
                      <button onClick={() => remove(e.id)} className="btn-danger !px-4 !py-1.5 !text-xs">🗑 Delete</button>
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
