"use client";
import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../components/Toast";

interface Slide {
  id: string; title: string; subtitle?: string|null; mediaUrl: string;
  mediaType: "IMAGE"|"VIDEO"; linkUrl?: string|null; sortOrder: number; isActive: boolean;
}
const EMPTY = { title:"", subtitle:"", mediaUrl:"", mediaType:"IMAGE" as const, linkUrl:"" };

export default function AdminHighlightsPage() {
  const { user, loading } = useAuth(); const toast = useToast();
  const [slides, setSlides] = useState<Slide[]>([]);
  const [fetching, setFetching] = useState(true);
  const [form, setForm] = useState<any>(EMPTY);
  const [editingId, setEditingId] = useState<string|null>(null);
  const [saving, setSaving] = useState(false);

  function load() { setFetching(true); api.get("/admin/highlights").then(r=>setSlides(r.data.highlights)).finally(()=>setFetching(false)); }
  useEffect(() => { if (user?.role==="ADMIN") load(); }, [user]);

  function startEdit(s: Slide) {
    setEditingId(s.id);
    setForm({ title:s.title, subtitle:s.subtitle||"", mediaUrl:s.mediaUrl, mediaType:s.mediaType, linkUrl:s.linkUrl||"" });
  }
  function cancelEdit() { setEditingId(null); setForm(EMPTY); }

  async function save() {
    if (!form.title.trim() || !form.mediaUrl.trim()) { toast.error("Title and media URL are required."); return; }
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/admin/highlights/${editingId}`, form);
        toast.success("Slide updated.");
      } else {
        await api.post("/admin/highlights", { ...form, sortOrder: Math.max(-1, ...slides.map(s => s.sortOrder)) + 1 });
        toast.success("Slide added.");
      }
      cancelEdit(); load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Could not save slide.");
    } finally { setSaving(false); }
  }

  async function remove(id: string) {
    if (!confirm("Remove this slide?")) return;
    await api.delete(`/admin/highlights/${id}`); toast.warning("Slide removed."); load();
  }
  async function toggleActive(s: Slide) {
    await api.put(`/admin/highlights/${s.id}`, { isActive: !s.isActive }); load();
  }
  async function move(index: number, dir: -1|1) {
    const target = index + dir;
    if (target < 0 || target >= slides.length) return;
    const a = slides[index], b = slides[target];
    await Promise.all([
      api.put(`/admin/highlights/${a.id}`, { sortOrder: b.sortOrder }),
      api.put(`/admin/highlights/${b.id}`, { sortOrder: a.sortOrder }),
    ]);
    load();
  }

  if (loading) return null;
  if (user?.role!=="ADMIN") return <div className="max-w-7xl mx-auto px-4 py-16 text-center text-gray-400">Admins only.</div>;

  return (
    <div className="animate-fade-in">
      <div className="bg-gradient-to-r from-violet-700 to-indigo-700 text-white px-4 sm:px-6 py-7">
        <div className="max-w-7xl mx-auto"><h1 className="font-extrabold text-2xl">Homepage Slideshow</h1>
        <p className="text-white/70 text-sm mt-1">Manage the image/video slides shown on the homepage hero.</p></div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 grid gap-6 lg:grid-cols-[1fr,380px]">
        <div>
          {fetching ? <p className="text-gray-400 text-sm">Loading…</p>
          : slides.length===0 ? <div className="card-base p-12 text-center"><p className="text-4xl mb-3">🖼️</p><p className="font-semibold text-gray-700">No slides yet — add your first one.</p></div>
          : <div className="space-y-3">{slides.map((s, i) => (
              <div key={s.id} className="card-base p-4 flex items-center gap-4">
                <div className="w-20 h-14 shrink-0 rounded-lg overflow-hidden bg-gray-100">
                  {s.mediaType==="VIDEO"
                    ? <video src={s.mediaUrl} muted className="w-full h-full object-cover" />
                    // eslint-disable-next-line @next/next/no-img-element
                    : <img src={s.mediaUrl} alt={s.title} className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-900 truncate">{s.title}</p>
                  {s.subtitle && <p className="text-xs text-gray-400 truncate">{s.subtitle}</p>}
                  <p className="text-[10px] uppercase tracking-wide text-gray-300 mt-0.5">{s.mediaType} · order {s.sortOrder} · {s.isActive ? "active" : "hidden"}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button onClick={() => move(i,-1)} disabled={i===0} className="btn-ghost !px-2 !py-1 !text-xs disabled:opacity-30">↑</button>
                  <button onClick={() => move(i,1)} disabled={i===slides.length-1} className="btn-ghost !px-2 !py-1 !text-xs disabled:opacity-30">↓</button>
                  <button onClick={() => toggleActive(s)} className="btn-secondary !px-3 !py-1 !text-xs">{s.isActive?"Hide":"Show"}</button>
                  <button onClick={() => startEdit(s)} className="btn-secondary !px-3 !py-1 !text-xs">Edit</button>
                  <button onClick={() => remove(s.id)} className="btn-danger !px-3 !py-1 !text-xs">Delete</button>
                </div>
              </div>
            ))}</div>}
        </div>

        <div className="card-base p-5 h-fit">
          <h2 className="font-bold text-gray-900 mb-3">{editingId ? "Edit slide" : "Add a slide"}</h2>
          <div className="space-y-3">
            <input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Title" className="input-base" />
            <input value={form.subtitle} onChange={e=>setForm({...form,subtitle:e.target.value})} placeholder="Subtitle (optional)" className="input-base" />
            <input value={form.mediaUrl} onChange={e=>setForm({...form,mediaUrl:e.target.value})} placeholder="Image or video URL" className="input-base" />
            <select value={form.mediaType} onChange={e=>setForm({...form,mediaType:e.target.value})} className="input-base">
              <option value="IMAGE">Image</option>
              <option value="VIDEO">Video</option>
            </select>
            <input value={form.linkUrl} onChange={e=>setForm({...form,linkUrl:e.target.value})} placeholder="Link when clicked (optional, e.g. /events)" className="input-base" />
            <div className="flex gap-2">
              <button onClick={save} disabled={saving} className="btn-primary flex-1 !py-2">{saving ? "Saving…" : editingId ? "Save changes" : "Add slide"}</button>
              {editingId && <button onClick={cancelEdit} className="btn-secondary !py-2">Cancel</button>}
            </div>
            <p className="text-[11px] text-gray-400">
              Paste a hosted image/video URL (e.g. from your CDN or an upload service). Direct file upload isn&apos;t wired up yet.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
