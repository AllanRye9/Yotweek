"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { EventItem } from "../../lib/types";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  HIDDEN: "bg-gray-200 text-gray-700",
  COMPLETED: "bg-blue-100 text-blue-700",
  CANCELLED: "bg-gray-200 text-gray-700",
};

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const [myEvents, setMyEvents] = useState<EventItem[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<{ totalPayout: number; totalCommission: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    api.get("/events/organizer/mine").then((res) => setMyEvents(res.data.events));
    api.get("/bookings/mine").then((res) => setBookings(res.data.bookings));
    if (user.role !== "USER") {
      api.get("/bookings/organizer/payouts").then((res) => setPayouts(res.data));
    }
  }, [user]);

  if (loading) return <div className="container-page py-10 text-sm text-savanna-900/50">Loading…</div>;
  if (!user) {
    return (
      <div className="container-page py-16 text-center">
        <h1 className="font-display text-2xl font-bold">Sign in to see your dashboard</h1>
        <Link href="/auth/login" className="btn-primary mt-6 inline-flex">Sign in</Link>
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">My dashboard</h1>
        <Link href="/events/create" className="btn-primary">List a new event</Link>
      </div>

      {payouts && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          <div className="card p-5">
            <p className="text-sm text-savanna-900/60">Total payouts received</p>
            <p className="font-display text-2xl font-bold">{payouts.totalPayout.toLocaleString()}</p>
          </div>
          <div className="card p-5">
            <p className="text-sm text-savanna-900/60">Platform commission paid</p>
            <p className="font-display text-2xl font-bold">{payouts.totalCommission.toLocaleString()}</p>
          </div>
        </div>
      )}

      <section className="mb-10">
        <h2 className="mb-3 font-display text-xl font-semibold">My listings</h2>
        {myEvents.length === 0 ? (
          <p className="text-sm text-savanna-900/50">You haven&apos;t listed anything yet.</p>
        ) : (
          <div className="space-y-3">
            {myEvents.map((e) => (
              <div key={e.id} className="card flex items-center justify-between p-4">
                <div>
                  <p className="font-semibold">{e.title}</p>
                  <p className="text-xs text-savanna-900/50">{format(new Date(e.startDate), "d MMM yyyy")} · {e.city}, {e.country}</p>
                  {e.isFlagged && <p className="mt-1 text-xs text-amber-600">⚠ {e.flagReason}</p>}
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[e.status]}`}>{e.status}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl font-semibold">My bookings</h2>
        {bookings.length === 0 ? (
          <p className="text-sm text-savanna-900/50">No bookings yet — go find something to do!</p>
        ) : (
          <div className="space-y-3">
            {bookings.map((b) => (
              <div key={b.id} className="card flex items-center justify-between p-4">
                <div>
                  <p className="font-semibold">{b.event.title}</p>
                  <p className="text-xs text-savanna-900/50">Qty {b.quantity} · {b.currency} {Number(b.totalAmount).toLocaleString()}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[b.status] || "bg-gray-100 text-gray-700"}`}>{b.status}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
