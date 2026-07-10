"use client";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { api } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../components/Toast";
import { AdminGuard } from "../../../components/AdminGuard";
import { isVideoUrl } from "../../../lib/media";

export default function AdminEventsPage() {
  const { user } = useAuth(); const toast = useToast();
  const [events, setEvents] = useState<any[]>([]); const [fetching, setFetching] = useState(true);
  const [tab, setTab] = useState<"pending"|"flagged">("pending");
  function load(t: "pending"|"flagged") { setFetching(true); api.get(t==="flagged"?"/admin/events/flagged":"/admin/events/pending").then(r=>setEvents(r.data.events)).finally(()=>setFetching(false)); }
  useEffect(() => { if (user?.role==="ADMIN") load(tab); }, [user,tab]);
  async function approve(id: string) { await api.post(`/admin/events/${id}/approve`); toast.success("Approved!"); load(tab); }
  async function reject(id: string) { const r=prompt("Reason?")||"Did not meet guidelines"; await api.post(`/admin/events/${id}/reject`,{reason:r}); toast.info("Rejected."); load(tab); }
  async function hide(id: string) { await api.post(`/admin/events/${id}/hide`); toast.warning("Hidden."); load(tab); }
  return (
    <AdminGuard>
    <div className="animate-fade-in">
      <div className="bg-gradient-to-r from-violet-700 to-indigo-700 text-white px-4 sm:px-6 py-7"><div className="max-w-7xl mx-auto"><h1 className="font-extrabold text-2xl">Listing Review Queue</h1></div></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex gap-2 mb-6">
          {(["pending","flagged"] as const).map(t => <button key={t} onClick={() => setTab(t)} className={tab===t?"tab-pill-active":"tab-pill-inactive"}>{t==="pending"?"⏳ Pending":"⚠️ Flagged"}</button>)}
        </div>
        {fetching ? <p className="text-gray-400 text-sm">Loading…</p>
        : events.length===0 ? <div className="card-base p-12 text-center"><p className="text-4xl mb-3">🎉</p><p className="font-semibold text-gray-700">Queue is empty!</p></div>
        : <div className="space-y-4">{events.map(e => (
            <div key={e.id} className="card-base p-5">
              <div className="flex flex-wrap items-start gap-4">
                <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
                  {e.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={e.coverImageUrl} alt={e.title} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl text-gray-300">🎪</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h2 className="font-extrabold text-gray-900">{e.title}</h2>
                    {e.isFlagged && <span className="badge bg-red-100 text-red-700">⚠️ Flagged</span>}
                    {e.reportCount>0 && <span className="badge bg-rose-100 text-rose-700">🚩 {e.reportCount} reports</span>}
                  </div>
                  <p className="text-sm text-gray-400 mb-1">{e.city}, {e.country} · {format(new Date(e.startDate),"d MMM yyyy")} · <strong>{e.priceType}</strong>{e.priceType==="PAID"?` (${e.currency} ${Number(e.price).toLocaleString()})`:""}</p>
                  <p className="text-xs text-gray-300 mb-2">By {e.organizer?.organizationName||e.organizer?.name} · {e.organizer?.role}{e.organizer?.isVerifiedOrganizer?" · ✓ verified":""}</p>
                  {e.isFlagged && e.flagReason && <p className="text-xs text-red-500 bg-red-50 px-3 py-1.5 rounded-lg mb-2">⚠️ {e.flagReason}</p>}
                  <p className="text-sm text-gray-500 line-clamp-2 mb-2">{e.description}</p>
                  {e.galleryUrls?.length > 0 && (
                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                      {e.galleryUrls.map((url: string, i: number) => (
                        isVideoUrl(url) ? (
                          <video key={i} src={url} muted autoPlay loop playsInline className="w-14 h-14 shrink-0 rounded-lg object-cover ring-1 ring-gray-200" />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={i} src={url} alt={`${e.title} gallery ${i+1}`} className="w-14 h-14 shrink-0 rounded-lg object-cover ring-1 ring-gray-200" />
                        )
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 flex-col gap-2">
                  <button onClick={() => approve(e.id)} className="btn-primary !px-4 !py-1.5 !text-xs">✓ Approve</button>
                  <button onClick={() => reject(e.id)} className="btn-danger !px-4 !py-1.5 !text-xs">✕ Reject</button>
                  <button onClick={() => hide(e.id)} className="btn-ghost !px-4 !py-1.5 !text-xs">🚫 Hide</button>
                </div>
              </div>
            </div>
          ))}</div>}
      </div>
    </div>
    </AdminGuard>
  );
}
