"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { format } from "date-fns";
import { api } from "../../../lib/api";
import { EventItem } from "../../../lib/types";
import { PriceBadge } from "../../../components/PriceBadge";
import { VerifiedBadge } from "../../../components/VerifiedBadge";
import { WeatherWidget } from "../../../components/WeatherWidget";
import { ShareButtons } from "../../../components/ShareButtons";
import { ReviewSection } from "../../../components/ReviewSection";
import { SimilarEvents } from "../../../components/SimilarEvents";
import { useAuth } from "../../../context/AuthContext";

// Leaflet touches `window` at import time, so it can only render client-side.
const EventMap = dynamic(() => import("../../../components/EventMap"), { ssr: false });

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [booking, setBooking] = useState(false);
  const [bookingMsg, setBookingMsg] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("SPAM");
  const [reportMsg, setReportMsg] = useState<string | null>(null);

  useEffect(() => {
    api.get(`/events/${id}`).then((res) => setEvent(res.data.event));
  }, [id]);

  async function handleBook(quantity = 1) {
    if (!user) {
      setBookingMsg("Please sign in to register or book.");
      return;
    }
    setBooking(true);
    try {
      const res = await api.post("/bookings", { eventId: id, quantity });
      setBookingMsg(res.data.requiresPayment ? "Booking created — complete payment to confirm your spot." : "You're registered! See you there.");
    } catch (err: any) {
      setBookingMsg(err?.response?.data?.error || "Could not complete booking.");
    } finally {
      setBooking(false);
    }
  }

  async function submitReport() {
    try {
      const res = await api.post("/reports", { eventId: id, reason: reportReason });
      setReportMsg(res.data.message);
    } catch (err: any) {
      setReportMsg(err?.response?.data?.error || "Could not submit report.");
    }
  }

  if (!event) return <div className="container-page py-10 text-sm text-savanna-900/50">Loading…</div>;

  return (
    <div className="container-page py-10">
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-4 h-64 w-full overflow-hidden rounded-2xl bg-gradient-to-br from-sunset-400 to-sunset-600">
            {event.coverImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={event.coverImageUrl} alt={event.title} className="h-full w-full object-cover" />
            )}
          </div>

          <div className="mb-2 flex flex-wrap items-center gap-2">
            <PriceBadge priceType={event.priceType} price={event.price} currency={event.currency} />
            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-savanna-900/70">
              {event.category.replace(/_/g, " ")}
            </span>
            {event.scope === "INTERNATIONAL" && (
              <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-savanna-900/70">🌍 International</span>
            )}
          </div>

          <h1 className="font-display text-3xl font-bold">{event.title}</h1>
          <p className="mt-2 text-savanna-900/70">
            {format(new Date(event.startDate), "EEEE, d MMMM yyyy · p")}
            {event.endDate ? ` – ${format(new Date(event.endDate), "d MMM yyyy")}` : ""}
          </p>
          <p className="text-savanna-900/70">
            {event.venueName ? `${event.venueName}, ` : ""}
            {event.city}, {event.country}
          </p>

          <div className="mt-6 whitespace-pre-line text-savanna-900/85">{event.description}</div>

          {event.languages?.length > 1 && (
            <p className="mt-4 text-sm text-savanna-900/60">
              Available in: {event.languages.join(", ").toUpperCase()}
            </p>
          )}

          <div className="mt-8">
            <ShareButtons title={event.title} url={typeof window !== "undefined" ? window.location.href : ""} />
          </div>

          <div className="mt-8">
            <ReviewSection eventId={event.id} />
          </div>

          <div className="mt-8">
            <SimilarEvents eventId={event.id} />
          </div>

          <div className="mt-6">
            <button onClick={() => setReportOpen(!reportOpen)} className="text-xs text-savanna-900/40 underline">
              Report this listing
            </button>
            {reportOpen && (
              <div className="card mt-2 max-w-sm p-4">
                <select value={reportReason} onChange={(e) => setReportReason(e.target.value)} className="mb-2 w-full rounded-lg border border-savanna-900/15 px-3 py-2 text-sm">
                  <option value="SPAM">Spam</option>
                  <option value="DUPLICATE">Duplicate listing</option>
                  <option value="SCAM_OR_FRAUD">Scam or fraud</option>
                  <option value="MISLEADING_INFO">Misleading information</option>
                  <option value="INAPPROPRIATE">Inappropriate content</option>
                  <option value="OTHER">Other</option>
                </select>
                <button onClick={submitReport} className="btn-secondary text-xs">Submit report</button>
                {reportMsg && <p className="mt-2 text-xs text-savanna-900/60">{reportMsg}</p>}
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="card p-5">
            <p className="mb-1 text-sm text-savanna-900/60">Organized by</p>
            <p className="font-semibold">{event.organizer?.organizationName || event.organizer?.name}</p>
            {event.organizer?.isVerifiedOrganizer && (
              <div className="mt-2">
                <VerifiedBadge />
              </div>
            )}

            <button
              onClick={() => handleBook(1)}
              disabled={booking}
              className="btn-primary mt-5 w-full"
            >
              {booking ? "Processing…" : event.priceType === "FREE" ? "Register for free" : `Book — ${event.currency} ${Number(event.price).toLocaleString()}`}
            </button>
            {bookingMsg && <p className="mt-2 text-xs text-savanna-900/70">{bookingMsg}</p>}

            {event.capacity && (
              <p className="mt-3 text-xs text-savanna-900/50">
                {Math.max(event.capacity - event.ticketsSold, 0)} of {event.capacity} spots remaining
              </p>
            )}
          </div>

          <WeatherWidget lat={event.latitude} lng={event.longitude} />

          {event.latitude && event.longitude && (
            <EventMap lat={event.latitude} lng={event.longitude} label={event.title} />
          )}
        </aside>
      </div>
    </div>
  );
}
