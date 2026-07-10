"use client";
import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../components/Toast";
import { AdminGuard } from "../../../components/AdminGuard";
import { Highlight } from "../../../lib/types";

const EMPTY = { title: "", subtitle: "", mediaUrl: "", mediaType: "IMAGE" as "IMAGE" | "VIDEO", linkUrl: "", sortOrder: 0 };

export default function AdminHighlightsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [slides, setSlides] = useState<Highlight[]>([]);
  const [fetching, setFetching] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  function load() {
    setFetching(true);
    api.get("/admin/highlights").then(r => setSlides(r.data.highlights)).finally(() => setFetching(false));
  }
  useEffect(() => { if (user?.role === "ADMIN") load(); }, [user]);

  function u(k: keyof typeof EMPTY, v: any) { setForm(f => ({ ...f, [k]: v })); }
  function startEdit(h: Highlight) {
    setEditingId(h.id);
    setForm({ title: h.title, subtitle: h.subtitle || "", mediaUrl: h.mediaUrl, mediaType: h.mediaType, linkUrl: h.linkUrl || "", sortOrder: h.sortOrder });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function cancelEdit() { setEditingId(null); setForm(EMPTY); }

  async function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image file."); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error("Image is too large (max 8MB)."); return; }
    setUploadingMedia(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const r = await api.post("/uploads/image", formData);
      u("mediaUrl", r.data.url);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Could not upload image.");
    } finally {
      setUploadingMedia(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.mediaUrl.trim()) { toast.error("Title and media URL/link are required."); return; }
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/admin/highlights/${editingId}`, form);
        toast.success("Slide updated.");
      } else {
        await api.post("/admin/highlights", { ...form, sortOrder: form.sortOrder ?? slides.length });
        toast.success("Slide added.");
      }
      cancelEdit();
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Could not save slide.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(h: Highlight) {
    await api.put(`/admin/highlights/${h.id}`, { isActive: !h.isActive });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Remove this slide from the homepage slideshow?")) return;
    await api.delete(`/admin/highlights/${id}`);
    toast.warning("Slide removed.");
    load();
  }

  async function move(h: Highlight, dir: -1 | 1) {
    const sorted = [...slides].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex(s => s.id === h.id);
    const swapWith = sorted[idx + dir];
    if (!swapWith) return;
    await Promise.all([
      api.put(`/admin/highlights/${h.id}`, { sortOrder: swapWith.sortOrder }),
      api.put(`/admin/highlights/${swapWith.id}`, { sortOrder: h.sortOrder }),
    ]);
    load();
  }

  const sorted = [...slides].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <AdminGuard>
    <div className="animate-fade-in">
      <div className="bg-gradient-to-r from-violet-700 to-indigo-700 text-white px-4 sm:px-6 py-7">
        <div className="max-w-7xl mx-auto">
          <h1 className="font-extrabold text-2xl">Hero Slideshow</h1>
          <p className="text-white/70 text-sm mt-1">Manage the image/video slides shown on the homepage hero.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Add / edit form */}
        <form onSubmit={submit} className="card-base p-5 h-fit space-y-3">
          <h2 className="font-bold text-gray-900 mb-1">{editingId ? "Edit slide" : "Add a new slide"}</h2>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Title</label>
            <input required value={form.title} onChange={e => u("title", e.target.value)} className="input-base" placeholder="Gulu Cultural Festival" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Subtitle</label>
            <input value={form.subtitle} onChange={e => u("subtitle", e.target.value)} className="input-base" placeholder="Optional caption" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Media type</label>
            <div className="grid grid-cols-2 gap-2">
              {(["IMAGE", "VIDEO"] as const).map(t => (
                <button key={t} type="button" onClick={() => u("mediaType", t)}
                  className={`py-2 rounded-xl border-2 text-xs font-semibold transition-all ${form.mediaType === t ? "border-sky-500 bg-sky-50 text-sky-700" : "border-gray-200 text-gray-600 hover:border-sky-200"}`}>
                  {t === "IMAGE" ? "🖼️ Image" : "🎬 Video"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              {form.mediaType === "IMAGE" ? "Slide image" : "Video URL"}
            </label>
            {form.mediaType === "IMAGE" ? (
              <>
                <div className="flex gap-3 items-center">
                  <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
                    {uploadingMedia ? (
                      <div className="w-5 h-5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                    ) : form.mediaUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={form.mediaUrl} alt="Slide preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl text-gray-300">🖼️</span>
                    )}
                  </div>
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImagePick} className="hidden" id="highlight-image-input" />
                  <label htmlFor="highlight-image-input" className="btn-secondary cursor-pointer !px-4 !py-2 !text-sm">
                    {uploadingMedia ? "Uploading…" : form.mediaUrl ? "Change photo" : "Upload photo"}
                  </label>
                </div>
                <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WEBP, or GIF — up to 8MB.</p>
              </>
            ) : (
              <>
                <input required value={form.mediaUrl} onChange={e => u("mediaUrl", e.target.value)} className="input-base" placeholder="https://…/video.mp4" />
                <p className="text-xs text-gray-400 mt-1">Video upload isn't wired up yet — paste a hosted video URL (Cloudinary, S3, your CDN).</p>
              </>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Link URL <span className="text-gray-400 font-normal">(optional)</span></label>
            <input value={form.linkUrl} onChange={e => u("linkUrl", e.target.value)} className="input-base" placeholder="/events/some-event" />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={saving} className="btn-primary !px-5 !py-2.5 flex-1 !justify-center">
              {saving ? "Saving…" : editingId ? "Save changes" : "Add slide"}
            </button>
            {editingId && <button type="button" onClick={cancelEdit} className="btn-ghost !px-4 !py-2.5">Cancel</button>}
          </div>
        </form>

        {/* Slide list */}
        <div>
          {fetching ? (
            <p className="text-gray-400 text-sm">Loading…</p>
          ) : sorted.length === 0 ? (
            <div className="card-base p-12 text-center">
              <p className="text-4xl mb-3">🎞️</p>
              <p className="font-semibold text-gray-700">No slides yet</p>
              <p className="text-gray-400 text-sm mt-1">Add your first slide using the form.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sorted.map((h, i) => (
                <div key={h.id} className="card-base p-4 flex gap-4 items-center">
                  <div className="w-24 h-16 rounded-lg overflow-hidden bg-slate-800 shrink-0 relative">
                    {h.mediaType === "VIDEO"
                      ? <video src={h.mediaUrl} muted autoPlay loop playsInline className="w-full h-full object-cover" />
                      // eslint-disable-next-line @next/next/no-img-element
                      : <img src={h.mediaUrl} alt={h.title} className="w-full h-full object-cover" />}
                    {!h.isActive && <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-[10px] font-bold text-white">HIDDEN</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm truncate">{h.title}</p>
                    {h.subtitle && <p className="text-xs text-gray-400 truncate">{h.subtitle}</p>}
                    <p className="text-[10px] text-gray-300 mt-0.5">{h.mediaType} · order {h.sortOrder}</p>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button onClick={() => move(h, -1)} disabled={i === 0} className="btn-ghost !px-2 !py-1 !text-xs disabled:opacity-30">↑</button>
                    <button onClick={() => move(h, 1)} disabled={i === sorted.length - 1} className="btn-ghost !px-2 !py-1 !text-xs disabled:opacity-30">↓</button>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button onClick={() => startEdit(h)} className="btn-secondary !px-3 !py-1 !text-xs">Edit</button>
                    <button onClick={() => toggleActive(h)} className="btn-ghost !px-3 !py-1 !text-xs">{h.isActive ? "Hide" : "Show"}</button>
                    <button onClick={() => remove(h.id)} className="btn-danger !px-3 !py-1 !text-xs">Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
    </AdminGuard>
  );
}
