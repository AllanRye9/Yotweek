"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "../../../lib/api";
import { Business } from "../../../lib/types";
import { WeatherWidget } from "../../../components/WeatherWidget";
import { ShareButtons } from "../../../components/ShareButtons";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../components/Toast";
import { recordSignal } from "../../../lib/preferences";
import { isVideoUrl } from "../../../lib/media";

const PRICE_LABELS: Record<string,string> = { BUDGET:"$ Budget", MODERATE:"$$ Moderate", EXPENSIVE:"$$$ Expensive", LUXURY:"$$$$ Luxury" };

export default function BusinessDetailPage() {
  const { id } = useParams<{ id:string }>();
  const { user } = useAuth(); const router = useRouter(); const toast = useToast();
  const [business, setBusiness] = useState<Business|null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("SPAM");

  useEffect(() => {
    api.get(`/businesses/${id}`)
      .then(r => {
        setBusiness(r.data.business);
        const b = r.data.business;
        recordSignal({ businessId:b.id, action:"view", city:b.city, tags:b.tags, category:b.category?.slug });
      })
      .catch(() => router.push("/businesses"));
  }, [id, router]);

  async function submitReport() {
    if (!user) { router.push("/auth/login"); return; }
    try { await api.post("/reports/business", { businessId:id, reason:reportReason }); toast.success("Report submitted."); setReportOpen(false); }
    catch { toast.error("Could not submit report."); }
  }

  if (!business) return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-4 animate-pulse">
      <div className="aspect-video shimmer rounded-2xl bg-slate-100" />
      <div className="card-base p-6 space-y-3">{[...Array(4)].map((_,i) => <div key={i} className="h-4 shimmer bg-slate-100 rounded w-3/4" />)}</div>
    </div>
  );

  return (
    <div className="animate-fade-in">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-2 text-xs text-gray-400">
          <Link href="/" className="hover:text-sky-600">Home</Link><span>/</span>
          <Link href="/businesses" className="hover:text-sky-600">Businesses</Link><span>/</span>
          <span className="text-gray-700 font-medium truncate">{business.name}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-5">
            {/* Cover */}
            <div className="relative rounded-2xl overflow-hidden aspect-video bg-gradient-to-br from-slate-200 to-slate-300">
              {business.coverImageUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={business.coverImageUrl} alt={business.name} className="w-full h-full object-cover" />
                : <div className="absolute inset-0 flex items-center justify-center text-7xl">🏪</div>}
              <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                {business.isVerified && <span className="badge-verif">✓ Verified</span>}
                {business.priceRange && <span className="badge bg-white/90 text-gray-700">{PRICE_LABELS[business.priceRange]}</span>}
              </div>
            </div>

            {/* Gallery */}
            {business.galleryUrls && business.galleryUrls.length > 0 && (
              <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
                {business.galleryUrls.map((url, i) => (
                  isVideoUrl(url) ? (
                    <video key={i} src={url} muted autoPlay loop playsInline
                      className="w-28 h-20 sm:w-32 sm:h-24 shrink-0 rounded-xl object-cover ring-1 ring-gray-200" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={url} alt={`${business.name} photo ${i + 1}`}
                      className="w-28 h-20 sm:w-32 sm:h-24 shrink-0 rounded-xl object-cover ring-1 ring-gray-200" />
                  )
                ))}
              </div>
            )}

            {/* Info */}
            <div className="card-base p-5 sm:p-7">
              {business.category && <span className="text-[11px] font-bold uppercase tracking-widest text-sky-600 bg-sky-50 px-2.5 py-1 rounded-full">{business.category.name}</span>}
              <h1 className="font-extrabold text-2xl sm:text-3xl text-gray-900 mt-3 mb-4">{business.name}</h1>
              <div className="grid sm:grid-cols-2 gap-3 mb-5 text-sm">
                <div className="flex items-start gap-3"><span className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600 text-sm shrink-0">📍</span><div><p className="font-semibold text-gray-900">{business.city}</p><p className="text-xs text-gray-400">{business.address}, {business.country}</p></div></div>
                {business.phone && <div className="flex items-start gap-3"><span className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600 text-sm shrink-0">📞</span><div><p className="font-semibold text-gray-900">{business.phone}</p></div></div>}
                {business.email && <div className="flex items-start gap-3"><span className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600 text-sm shrink-0">✉️</span><div><p className="font-semibold text-gray-900">{business.email}</p></div></div>}
                {business.website && <div className="flex items-start gap-3"><span className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600 text-sm shrink-0">🌐</span><a href={business.website} target="_blank" rel="noopener noreferrer" className="font-semibold text-sky-600 hover:underline">{business.website}</a></div>}
              </div>
              <div className="border-t border-gray-100 pt-5">
                <h3 className="font-bold text-gray-900 mb-2">About</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{business.description}</p>
              </div>
              {business.tags?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">{business.tags.map(t => <span key={t} className="badge bg-slate-100 text-slate-600">#{t}</span>)}</div>
              )}
            </div>

            <div className="card-base p-5">
              <h3 className="font-bold text-gray-900 mb-3 text-sm">Share this business</h3>
              <ShareButtons title={business.name} url={typeof window !== "undefined" ? window.location.href : ""} />
            </div>

            <div className="text-center pb-2">
              <button onClick={() => setReportOpen(p=>!p)} className="text-xs text-gray-300 hover:text-red-400 underline underline-offset-2 transition-colors">Report this listing</button>
              {reportOpen && (
                <div className="card-base mt-3 p-4 max-w-sm mx-auto text-left">
                  <select value={reportReason} onChange={e=>setReportReason(e.target.value)} className="input-base !text-sm mb-3">
                    {["SPAM","DUPLICATE","SCAM_OR_FRAUD","MISLEADING_INFO","INAPPROPRIATE","OTHER"].map(r => <option key={r} value={r}>{r.replace(/_/g," ")}</option>)}
                  </select>
                  <button onClick={submitReport} className="btn-danger !text-xs !px-4 !py-2">Submit report</button>
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="card-base p-5">
              <p className="font-bold text-gray-900 mb-3">Contact</p>
              {business.phone && <a href={`tel:${business.phone}`} className="btn-primary w-full !py-2.5 !rounded-xl !justify-center mb-2 !text-sm">📞 Call now</a>}
              {business.email && <a href={`mailto:${business.email}`} className="btn-secondary w-full !py-2.5 !rounded-xl !justify-center !text-sm">✉️ Send email</a>}
            </div>
            <WeatherWidget lat={business.latitude} lng={business.longitude} />
          </aside>
        </div>
      </div>
    </div>
  );
}
