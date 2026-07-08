"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { api } from "../../../lib/api";
import { EventItem } from "../../../lib/types";
import { EventCard } from "../../../components/EventCard";
import { SkeletonCard } from "../../../components/SkeletonCard";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../components/Toast";
import { WeatherWidget } from "../../../components/WeatherWidget";
import { ReviewSection } from "../../../components/ReviewSection";
import { ShareButtons } from "../../../components/ShareButtons";
import { recordSignal } from "../../../lib/preferences";

const CAT_ICON: Record<string, string> = {
  FESTIVAL:"🎪", CONFERENCE:"🎤", CONCERT:"🎵", SPORTS:"⚽",
  CULTURAL_HERITAGE:"🏛️", NIGHTLIFE:"🌙", WORKSHOP:"🛠️", GUIDED_TOUR:"🗺️",
  ADVENTURE_OUTDOOR:"⛰️", WILDLIFE_SAFARI:"🦁", FOOD_DRINK:"🍲",
  RELIGIOUS:"🕌", EXHIBITION:"🖼️", OTHER:"🌍",
};

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [similar, setSimilar] = useState<EventItem[]>([]);
  const [saved, setSaved] = useState(false);
  const [booking, setBooking] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("SPAM");
  const readTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    api.get(`/events/${id}`)
      .then(r => {
        setEvent(r.data.event);
        const e = r.data.event;
        recordSignal({ eventId:e.id, action:"view", category:e.category, city:e.city, tags:e.tags });
        // Track read time — record a "read" signal after 15s
        readTimer.current = setTimeout(() => {
          recordSignal({ eventId:e.id, action:"read", category:e.category, city:e.city, tags:e.tags, durationMs:15000 });
        }, 15000);
        api.get(`/recommendations/events/${id}/similar`).then(r2 => setSimilar(r2.data.events)).catch(() => {});
      })
      .catch(() => router.push("/events"));
    return () => { if (readTimer.current) clearTimeout(readTimer.current); };
  }, [id, router]);

  async function handleBook() {
    if (!user) { router.push("/auth/login"); return; }
    setBooking(true);
    try {
      const r = await api.post("/bookings", { eventId:id, quantity:1 });
      if (r.data.requiresPayment) toast.info("Booking created — complete payment to confirm.");
      else {
        toast.success("You're registered! See you there 🎉");
        recordSignal({ eventId:id, action:"book", category:event?.category, city:event?.city, tags:event?.tags });
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "Could not complete booking.");
    } finally { setBooking(false); }
  }

  async function handleSave() {
    if (!user) { router.push("/auth/login"); return; }
    try {
      if (saved) {
        await api.delete(`/users/me/saved-events/${id}`);
        setSaved(false); toast.info("Removed from saved events.");
      } else {
        await api.post(`/users/me/saved-events/${id}`);
        setSaved(true); toast.success("Saved to your dashboard!");
        recordSignal({ eventId:id, action:"save", category:event?.category, city:event?.city, tags:event?.tags });
      }
    } catch { toast.error("Could not update saved events."); }
  }

  async function submitReport() {
    if (!user) { router.push("/auth/login"); return; }
    try {
      await api.post("/reports", { eventId:id, reason:reportReason });
      toast.success("Report submitted. Our team will review it.");
      setReportOpen(false);
    } catch { toast.error("Could not submit report."); }
  }

  if (!event) return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="aspect-video shimmer rounded-2xl bg-slate-100 animate-pulse" />
          <div className="card-base p-6 space-y-3">{[...Array(5)].map((_,i) => <div key={i} className={`h-4 shimmer bg-slate-100 rounded ${i===0?"w-1/3":i===1?"w-full":"w-2/3"}`} />)}</div>
        </div>
        <div className="space-y-4">{[0,1].map(i => <SkeletonCard key={i} />)}</div>
      </div>
    </div>
  );

  const icon = CAT_ICON[event.category] || "🌍";
  const spotsLeft = event.capacity ? Math.max(0, event.capacity - event.ticketsSold) : null;

  return (
    <div className="animate-fade-in">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-2 text-xs text-gray-400">
          <Link href="/" className="hover:text-sky-600 transition-colors">Home</Link>
          <span>/</span>
          <Link href="/events" className="hover:text-sky-600 transition-colors">Events</Link>
          <span>/</span>
          <span className="text-gray-700 truncate font-medium">{event.title}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left */}
          <div className="lg:col-span-2 space-y-5">
            {/* Cover */}
            <div className="relative rounded-2xl overflow-hidden aspect-video bg-gradient-to-br from-sky-400 to-indigo-600">
              {event.coverImageUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={event.coverImageUrl} alt={event.title} className="w-full h-full object-cover" />
                : <div className="absolute inset-0 flex items-center justify-center" style={{fontSize:"5rem"}}>{icon}</div>}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                <span className={event.priceType === "FREE" ? "badge-free" : "badge-paid"}>
                  {event.priceType === "FREE" ? "🆓 Free" : `🎫 ${event.currency} ${Number(event.price).toLocaleString()}`}
                </span>
                {event.scope === "INTERNATIONAL" && <span className="badge-intl">🌍 International</span>}
                {event.organizer?.isVerifiedOrganizer && <span className="badge-verif">✓ Verified</span>}
              </div>
            </div>

            {/* Gallery */}
            {event.galleryUrls && event.galleryUrls.length > 0 && (
              <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
                {event.galleryUrls.map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={url} alt={`${event.title} photo ${i + 1}`}
                    className="w-28 h-20 sm:w-32 sm:h-24 shrink-0 rounded-xl object-cover ring-1 ring-gray-200" />
                ))}
              </div>
            )}

            {/* Info card */}
            <div className="card-base p-5 sm:p-7">
              <span className="text-[11px] font-bold uppercase tracking-widest text-sky-600 bg-sky-50 px-2.5 py-1 rounded-full">
                {icon} {event.category.replace(/_/g," ")}
              </span>
              <h1 className="font-extrabold text-2xl sm:text-3xl text-gray-900 leading-tight mt-3 mb-4">{event.title}</h1>

              <div className="grid sm:grid-cols-2 gap-3 mb-5 text-sm">
                {[
                  { icon:"📅", title:format(new Date(event.startDate), "EEEE, d MMMM yyyy"), sub:`${format(new Date(event.startDate), "p")} · ${event.timezone}` },
                  { icon:"📍", title:event.venueName || event.city, sub:`${event.address ? event.address+", " : ""}${event.city}, ${event.country}` },
                  event.organizer && { icon:"👤", title:event.organizer.organizationName || event.organizer.name, sub: event.organizer.isVerifiedOrganizer ? "✓ Verified organizer" : "Organizer" },
                  event.languages?.length > 0 && { icon:"🗣️", title:event.languages.map(l => l.toUpperCase()).join(", "), sub:"Languages" },
                ].filter(Boolean).map((item: any, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600 text-sm shrink-0">{item.icon}</span>
                    <div>
                      <p className="font-semibold text-gray-900">{item.title}</p>
                      <p className={`text-xs ${item.sub?.startsWith("✓") ? "text-sky-600 font-semibold" : "text-gray-400"}`}>{item.sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-100 pt-5">
                <h3 className="font-bold text-gray-900 mb-2">About this event</h3>
                <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{event.description}</p>
              </div>

              {event.tags?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {event.tags.map(t => <span key={t} className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">#{t}</span>)}
                </div>
              )}
            </div>

            {/* Share */}
            <div className="card-base p-5">
              <h3 className="font-bold text-gray-900 mb-3 text-sm">Share this event</h3>
              <ShareButtons title={event.title} url={typeof window !== "undefined" ? window.location.href : ""} />
            </div>

            <ReviewSection eventId={event.id} />

            {/* Report */}
            <div className="text-center pb-2">
              <button onClick={() => setReportOpen(p => !p)} className="text-xs text-gray-300 hover:text-red-400 underline underline-offset-2 transition-colors">
                Report this listing
              </button>
              {reportOpen && (
                <div className="card-base mt-3 p-4 max-w-sm mx-auto text-left">
                  <p className="text-sm font-semibold text-gray-800 mb-2">Why are you reporting this?</p>
                  <select value={reportReason} onChange={e => setReportReason(e.target.value)} className="input-base !text-sm mb-3">
                    {["SPAM","DUPLICATE","SCAM_OR_FRAUD","MISLEADING_INFO","INAPPROPRIATE","OTHER"].map(r =>
                      <option key={r} value={r}>{r.replace(/_/g," ")}</option>
                    )}
                  </select>
                  <button onClick={submitReport} className="btn-danger !text-xs !px-4 !py-2">Submit report</button>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            {/* Booking card */}
            <div className="card-base p-5 sticky top-4">
              <div className="pb-4 mb-4 border-b border-gray-100">
                {event.priceType === "FREE"
                  ? <p className="font-extrabold text-2xl text-emerald-600">Free admission</p>
                  : <p className="font-extrabold text-2xl text-sky-700">{event.currency} {Number(event.price).toLocaleString()} <span className="text-sm text-gray-400 font-normal">/ person</span></p>}
                {spotsLeft !== null && (
                  <p className={`text-xs font-semibold mt-1 ${spotsLeft < 10 ? "text-red-500" : "text-gray-400"}`}>
                    {spotsLeft === 0 ? "Sold out" : `${spotsLeft.toLocaleString()} of ${event.capacity?.toLocaleString()} spots left`}
                  </p>
                )}
              </div>
              <button onClick={handleBook} disabled={booking || spotsLeft === 0}
                className="btn-primary w-full !py-3 !rounded-xl !justify-center mb-3 disabled:opacity-50">
                {booking ? "Processing…" : spotsLeft === 0 ? "Sold out" : event.priceType === "FREE" ? "Register free" : "Book now"}
              </button>
              <button onClick={handleSave}
                className={`btn-secondary w-full !py-2.5 !rounded-xl !justify-center !text-sm ${saved ? "!border-sky-400 !text-sky-600 !bg-sky-50" : ""}`}>
                {saved ? "❤️ Saved" : "🤍 Save event"}
              </button>
              {event.priceType === "PAID" && (
                <p className="text-[10px] text-gray-400 text-center mt-3 leading-relaxed">
                  A {event.commissionPct ?? 5}% platform fee applies. Secure payment via Mobile Money, Card, or Bank Transfer.
                </p>
              )}
            </div>

            <WeatherWidget lat={event.latitude} lng={event.longitude} />

            <div className="card-base p-4">
              <p className="text-sm font-semibold text-gray-800 mb-2">📅 Planning a trip?</p>
              <p className="text-xs text-gray-500 mb-3">Add this event to your day-by-day itinerary.</p>
              <Link href="/itinerary" className="btn-secondary w-full !py-2 !text-xs !justify-center">Open itinerary builder</Link>
            </div>
          </aside>
        </div>

        {/* Similar events */}
        {similar.length > 0 && (
          <div className="mt-10">
            <div className="section-row">
              <h2 className="section-title">Similar events you might like</h2>
              <span className="algo-chip">👥 Collaborative</span>
            </div>
            <div className="listing-grid stagger">{similar.slice(0,4).map(e => <EventCard key={e.id} event={e} algoSource="collaborative" />)}</div>
          </div>
        )}
      </div>
    </div>
  );
}
