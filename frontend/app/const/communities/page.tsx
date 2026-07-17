"use client";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { api } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../components/Toast";
import { AdminGuard } from "../../../components/AdminGuard";
import { GalleryThumb } from "../../../components/GalleryThumb";

const EDIT_EMPTY = { name: "", description: "" };

export default function AdminCommunitiesPage() {
  const { user } = useAuth(); const toast = useToast();
  const [communities, setCommunities] = useState<any[]>([]); const [fetching, setFetching] = useState(true);
  const [tab, setTab] = useState<"pending"|"all">("pending");
  const [q, setQ] = useState("");
  const [editingId, setEditingId] = useState<string|null>(null);
  const [editForm, setEditForm] = useState(EDIT_EMPTY);

  function load(t: "pending"|"all") {
    setFetching(true);
    const url = t === "all" ? "/admin/communities/all" : "/admin/communities/pending";
    api.get(url, t === "all" && q ? { params: { q } } : undefined).then(r=>setCommunities(r.data.communities)).finally(()=>setFetching(false));
  }
  useEffect(() => { if (user?.role==="ADMIN") load(tab); }, [user,tab]); // eslint-disable-line react-hooks/exhaustive-deps

  async function approve(id: string) {
    try { await api.post(`/admin/communities/${id}/approve`); toast.success("Approved!"); load(tab); }
    catch (err: any) { toast.error(err?.response?.data?.error || "Could not approve — it may no longer exist."); load(tab); }
  }
  async function reject(id: string) {
    const r=prompt("Reason?")||"Did not meet guidelines";
    try { await api.post(`/admin/communities/${id}/reject`,{reason:r}); toast.info("Rejected."); load(tab); }
    catch (err: any) { toast.error(err?.response?.data?.error || "Could not reject — it may no longer exist."); load(tab); }
  }
  async function hide(id: string) {
    try { await api.post(`/admin/communities/${id}/hide`); toast.warning("Hidden."); load(tab); }
    catch (err: any) { toast.error(err?.response?.data?.error || "Could not hide — it may no longer exist."); load(tab); }
  }
  async function toggleFeature(c: any) {
    try { await api.put(`/admin/communities/${c.id}`, { isFeatured: !c.isFeatured }); load(tab); }
    catch (err: any) { toast.error(err?.response?.data?.error || "Could not update — it may no longer exist."); load(tab); }
  }
  async function remove(id: string) {
    if (!confirm("Permanently delete this community? Members and community posts go with it — events/businesses just get unlinked. This can't be undone.")) return;
    try { await api.delete(`/admin/communities/${id}`); toast.warning("Deleted."); load(tab); }
    catch (err: any) { toast.error(err?.response?.data?.error || "Could not delete community."); }
  }
  function startEdit(c: any) { setEditingId(c.id); setEditForm({ name: c.name, description: c.description }); }
  async function saveEdit(id: string) {
    try {
      await api.put(`/admin/communities/${id}`, { name: editForm.name, description: editForm.description });
      toast.success("Community updated.");
      setEditingId(null);
      load(tab);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Could not save changes — this community may no longer exist.");
      load(tab);
    }
  }

  return (
    <AdminGuard>
    <div className="animate-fade-in">
      <div className="bg-gradient-to-r from-violet-700 to-indigo-700 text-white px-6 sm:px-9 py-11"><div className="max-w-7xl mx-auto"><h1 className="font-extrabold text-2xl">Community Management</h1><p className="text-white/70 text-sm mt-1">Review new communities, or edit/feature/remove any of them.</p></div></div>
      <div className="max-w-7xl mx-auto px-6 sm:px-9 py-9">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex gap-2">
            {(["pending","all"] as const).map(t => <button key={t} onClick={() => setTab(t)} className={tab===t?"tab-pill-active":"tab-pill-inactive"}>{t==="pending"?"⏳ Pending":"📋 All communities"}</button>)}
          </div>
          {tab==="all" && (
            <form onSubmit={e => { e.preventDefault(); load("all"); }} className="flex gap-2">
              <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search name…" className="input-base !py-1.5 !text-sm !w-56" />
              <button type="submit" className="btn-secondary !px-4 !py-1.5 !text-sm">Search</button>
            </form>
          )}
        </div>
        {fetching ? <p className="text-gray-400 text-sm">Loading…</p>
        : communities.length===0 ? <div className="card-base p-12 text-center"><p className="text-4xl mb-3">🎉</p><p className="font-semibold text-gray-700">{tab==="all"?"No communities match.":"Queue is empty!"}</p></div>
        : <div className="space-y-4">{communities.map(c => (
            <div key={c.id} className="card-base p-5">
              <div className="flex flex-wrap items-start gap-4">
                <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
                  {c.coverImageUrl ? (
                    <GalleryThumb url={c.coverImageUrl} alt={c.name} className="w-full h-full object-cover" fallbackIcon="🤝" />
                  ) : (
                    <span className="text-3xl text-gray-300">🤝</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {editingId === c.id ? (
                    <div className="space-y-2 mb-2">
                      <input value={editForm.name} onChange={ev=>setEditForm(f=>({...f,name:ev.target.value}))} className="input-base !py-1.5 !text-sm" placeholder="Name" />
                      <textarea value={editForm.description} onChange={ev=>setEditForm(f=>({...f,description:ev.target.value}))} className="textarea-base !py-1.5 !text-sm" rows={2} placeholder="Description" />
                      <div className="flex gap-2">
                        <button onClick={() => saveEdit(c.id)} className="btn-primary !px-4 !py-1.5 !text-xs">Save</button>
                        <button onClick={() => setEditingId(null)} className="btn-ghost !px-4 !py-1.5 !text-xs">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h2 className="font-extrabold text-gray-900">{c.name}</h2>
                        <span className="badge bg-gray-100 text-gray-600">{c.status}</span>
                        {c.isFeatured && <span className="badge bg-amber-100 text-amber-700">⭐ Featured</span>}
                      </div>
                      <p className="text-sm text-gray-400 mb-1">
                        {[c.city, c.country].filter(Boolean).join(", ")}{c.interestTag ? ` · 🏷️ ${c.interestTag}` : ""}{c.createdAt ? ` · started ${format(new Date(c.createdAt),"d MMM yyyy")}` : ""}
                      </p>
                      <p className="text-xs text-gray-300 mb-2">By {c.creator?.organizationName||c.creator?.name}{c.creator?.isVerifiedOrganizer?" · ✓ verified":""}</p>
                      {c._count && <p className="text-xs text-gray-400 mb-2">👥 {c._count.members} members · 🎪 {c._count.events} events · 🏪 {c._count.businesses} businesses · 📝 {c._count.posts} posts</p>}
                      {c.rejectedReason && <p className="text-xs text-red-500 bg-red-50 px-3 py-1.5 rounded-lg mb-2">⚠️ Rejected: {c.rejectedReason}</p>}
                      <p className="text-sm text-gray-500 line-clamp-2 mb-2">{c.description}</p>
                    </>
                  )}
                </div>
                <div className="flex shrink-0 flex-col gap-2">
                  {tab !== "all" ? (
                    <>
                      <button onClick={() => approve(c.id)} className="btn-primary !px-4 !py-1.5 !text-xs">✓ Approve</button>
                      <button onClick={() => reject(c.id)} className="btn-danger !px-4 !py-1.5 !text-xs">✕ Reject</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEdit(c)} className="btn-secondary !px-4 !py-1.5 !text-xs">✎ Edit</button>
                      <button onClick={() => toggleFeature(c)} className="btn-ghost !px-4 !py-1.5 !text-xs">{c.isFeatured ? "☆ Unfeature" : "⭐ Feature"}</button>
                      <button onClick={() => hide(c.id)} className="btn-ghost !px-4 !py-1.5 !text-xs">🚫 Hide</button>
                      <button onClick={() => remove(c.id)} className="btn-danger !px-4 !py-1.5 !text-xs">🗑 Delete</button>
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
