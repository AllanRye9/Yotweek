"use client";
import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../components/Toast";
import { AdminGuard } from "../../../components/AdminGuard";
import { EventVideo, EventVideoStatus } from "../../../lib/types";
import { getYouTubeId } from "../../../lib/media";

const EMPTY = { title: "", caption: "", videoUrl: "", thumbnailUrl: "", timing: "UPCOMING" as "PAST" | "UPCOMING", eventId: "", sortOrder: 0 };

const STATUS_LABEL: Record<EventVideoStatus, string> = { PENDING: "⏳ Pending", APPROVED: "✅ Approved", REJECTED: "🚫 Rejected" };

export default function AdminEventVideosPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [videos, setVideos] = useState<EventVideo[]>([]);
  const [fetching, setFetching] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [filter, setFilter] = useState<EventVideoStatus | "ALL">("PENDING");

  function load() {
    setFetching(true);
    api.get("/admin/event-videos").then(r => setVideos(r.data.videos)).finally(() => setFetching(false));
  }
  useEffect(() => { if (user?.role === "ADMIN") load(); }, [user]);

  function u(k: keyof typeof EMPTY, v: any) { setForm(f => ({ ...f, [k]: v })); }
  function startEdit(v: EventVideo) {
    setEditingId(v.id);
    setForm({ title: v.title, caption: v.caption || "", videoUrl: v.videoUrl, thumbnailUrl: v.thumbnailUrl || "", timing: v.timing, eventId: v.eventId || "", sortOrder: v.sortOrder });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function cancelEdit() { setEditingId(null); setForm(EMPTY); }

  async function handleVideoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("video/")) { toast.error("Please choose a video file."); return; }
    if (file.size > 50 * 1024 * 1024) { toast.error("Video is too large (max 50MB)."); return; }
    setUploadingMedia(true);
    try {
      const formData = new FormData();
      formData.append("video", file);
      const r = await api.post("/uploads/video", formData);
      u("videoUrl", r.data.url);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Could not upload video.");
    } finally {
      setUploadingMedia(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.videoUrl.trim()) { toast.error("Title and video are required."); return; }
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/admin/event-videos/${editingId}`, { ...form, eventId: form.eventId || null });
        toast.success("Clip updated.");
      } else {
        await api.post("/event-videos", { ...form, eventId: form.eventId || null, sortOrder: form.sortOrder ?? videos.length });
        toast.success("Clip added and approved.");
      }
      cancelEdit();
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Could not save clip.");
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(v: EventVideo, status: EventVideoStatus) {
    try {
      await api.put(`/admin/event-videos/${v.id}`, { status });
      toast.success(status === "APPROVED" ? "Clip approved." : status === "REJECTED" ? "Clip rejected." : "Clip updated.");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Could not update this clip — it may no longer exist.");
      load();
    }
  }

  async function toggleActive(v: EventVideo) {
    try {
      await api.put(`/admin/event-videos/${v.id}`, { isActive: !v.isActive });
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Could not update this clip — it may no longer exist.");
      load();
    }
  }

  async function remove(id: string) {
    if (!confirm("Remove this clip from the slider?")) return;
    try {
      await api.delete(`/admin/event-videos/${id}`);
      toast.warning("Clip removed.");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Could not remove this clip — it may already be gone.");
      load();
    }
  }

  async function move(v: EventVideo, dir: -1 | 1) {
    const group = sorted.filter(x => x.timing === v.timing);
    const idx = group.findIndex(x => x.id === v.id);
    const swapWith = group[idx + dir];
    if (!swapWith) return;
    try {
      await Promise.all([
        api.put(`/admin/event-videos/${v.id}`, { sortOrder: swapWith.sortOrder }),
        api.put(`/admin/event-videos/${swapWith.id}`, { sortOrder: v.sortOrder }),
      ]);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Could not reorder — the list may have changed. Refreshing.");
      load();
    }
  }

  const sorted = [...videos].sort((a, b) => a.sortOrder - b.sortOrder);
  const filtered = filter === "ALL" ? sorted : sorted.filter(v => v.status === filter);

  return (
    <AdminGuard>
    <div className="animate-fade-in">
      <div className="bg-gradient-to-r from-violet-700 to-indigo-700 text-white px-6 sm:px-9 py-11">
        <div className="max-w-7xl mx-auto">
          <h1 className="font-extrabold text-2xl">Homepage Event Videos</h1>
          <p className="text-white/70 text-sm mt-1">Review clips submitted by verified organizers, or add your own for the past/upcoming events slider.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 sm:px-9 py-9 grid gap-9 lg:grid-cols-[380px_1fr]">
        {/* Add / edit form */}
        <form onSubmit={submit} className="card-base p-5 h-fit space-y-3">
          <h2 className="font-bold text-gray-900 mb-1">{editingId ? "Edit clip" : "Add a new clip"}</h2>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Title</label>
            <input required value={form.title} onChange={e => u("title", e.target.value)} className="input-base" placeholder="Gulu Cultural Festival highlights" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Caption</label>
            <input value={form.caption} onChange={e => u("caption", e.target.value)} className="input-base" placeholder="Optional caption" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Timing</label>
            <div className="grid grid-cols-2 gap-2">
              {(["UPCOMING", "PAST"] as const).map(t => (
                <button key={t} type="button" onClick={() => u("timing", t)}
                  className={`py-2 rounded-xl border-2 text-xs font-semibold transition-all ${form.timing === t ? "border-sky-500 bg-sky-50 text-sky-700" : "border-gray-200 text-gray-600 hover:border-sky-200"}`}>
                  {t === "UPCOMING" ? "🎬 Upcoming" : "📼 Past"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Video</label>
            <div className="flex gap-3 items-center">
              <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
                {uploadingMedia ? (
                  <div className="w-5 h-5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                ) : form.videoUrl && getYouTubeId(form.videoUrl) ? (
                  <span className="text-xl">▶️</span>
                ) : form.videoUrl ? (
                  <video src={form.videoUrl} muted autoPlay loop playsInline className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl text-gray-300">🎬</span>
                )}
              </div>
              <input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={handleVideoPick} className="hidden" id="event-video-input" />
              <label htmlFor="event-video-input" className="btn-secondary cursor-pointer !px-4 !py-2 !text-sm">
                {uploadingMedia ? "Uploading…" : form.videoUrl ? "Change video" : "Upload video"}
              </label>
            </div>
            <p className="text-xs text-gray-400 mt-1 mb-2">MP4, WEBM, or MOV — up to 50MB.</p>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-px flex-1 bg-gray-200" /><span className="text-[11px] text-gray-400">or</span><div className="h-px flex-1 bg-gray-200" />
            </div>
            <input
              value={form.videoUrl && getYouTubeId(form.videoUrl) ? form.videoUrl : ""}
              onChange={e => u("videoUrl", e.target.value)}
              className="input-base"
              placeholder="Paste a YouTube link — https://youtube.com/watch?v=…"
            />
            {form.videoUrl && !getYouTubeId(form.videoUrl) && !uploadingMedia && form.videoUrl.startsWith("http") && !form.videoUrl.match(/\.(mp4|webm|mov)/i) && (
              <p className="text-xs text-amber-600 mt-1">That doesn't look like a YouTube link — paste a youtube.com or youtu.be URL.</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Thumbnail URL <span className="text-gray-400 font-normal">(optional)</span></label>
            <input value={form.thumbnailUrl} onChange={e => u("thumbnailUrl", e.target.value)} className="input-base" placeholder="https://…/poster.jpg" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Linked event ID <span className="text-gray-400 font-normal">(optional)</span></label>
            <input value={form.eventId} onChange={e => u("eventId", e.target.value)} className="input-base" placeholder="Tapping the clip opens this event" />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={saving} className="btn-primary !px-5 !py-2.5 flex-1 !justify-center">
              {saving ? "Saving…" : editingId ? "Save changes" : "Add clip"}
            </button>
            {editingId && <button type="button" onClick={cancelEdit} className="btn-ghost !px-4 !py-2.5">Cancel</button>}
          </div>
        </form>

        {/* Clip list */}
        <div>
          <div className="flex gap-2 mb-4">
            {(["PENDING", "APPROVED", "REJECTED", "ALL"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${filter === f ? "bg-sky-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {f === "ALL" ? "All" : STATUS_LABEL[f]}
              </button>
            ))}
          </div>

          {fetching ? (
            <p className="text-gray-400 text-sm">Loading…</p>
          ) : filtered.length === 0 ? (
            <div className="card-base p-12 text-center">
              <p className="text-4xl mb-3">🎞️</p>
              <p className="font-semibold text-gray-700">No clips here</p>
              <p className="text-gray-400 text-sm mt-1">Nothing matches this filter right now.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((v, i) => (
                <div key={v.id} className="card-base p-4 flex gap-4 items-center">
                  <div className="w-24 h-16 rounded-lg overflow-hidden bg-slate-800 shrink-0 relative">
                    {getYouTubeId(v.videoUrl) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`https://img.youtube.com/vi/${getYouTubeId(v.videoUrl)}/mqdefault.jpg`} alt={v.title} className="w-full h-full object-cover" />
                    ) : (
                      <video src={v.videoUrl} muted autoPlay loop playsInline className="w-full h-full object-cover" />
                    )}
                    {!v.isActive && <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-[10px] font-bold text-white">HIDDEN</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm truncate">{v.title}</p>
                    {v.caption && <p className="text-xs text-gray-400 truncate">{v.caption}</p>}
                    <p className="text-[10px] text-gray-300 mt-0.5">{v.timing} · {STATUS_LABEL[v.status]} · order {v.sortOrder}</p>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button onClick={() => move(v, -1)} disabled={i === 0} className="btn-ghost !px-2 !py-1 !text-xs disabled:opacity-30">↑</button>
                    <button onClick={() => move(v, 1)} disabled={i === filtered.length - 1} className="btn-ghost !px-2 !py-1 !text-xs disabled:opacity-30">↓</button>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {v.status === "PENDING" && (
                      <>
                        <button onClick={() => setStatus(v, "APPROVED")} className="btn-primary !px-3 !py-1 !text-xs">Approve</button>
                        <button onClick={() => setStatus(v, "REJECTED")} className="btn-danger !px-3 !py-1 !text-xs">Reject</button>
                      </>
                    )}
                    <button onClick={() => startEdit(v)} className="btn-secondary !px-3 !py-1 !text-xs">Edit</button>
                    <button onClick={() => toggleActive(v)} className="btn-ghost !px-3 !py-1 !text-xs">{v.isActive ? "Hide" : "Show"}</button>
                    <button onClick={() => remove(v.id)} className="btn-danger !px-3 !py-1 !text-xs">Remove</button>
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
