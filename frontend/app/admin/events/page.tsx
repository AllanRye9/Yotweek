"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { api } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { EventItem } from "../../../lib/types";

export default function AdminEventsPage() {
  const { user, loading } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);

  function load() {
    api.get("/admin/events/pending").then((res) => setEvents(res.data.events));
  }

  useEffect(() => {
    if (user?.role === "ADMIN") load();
  }, [user]);

  async function approve(id: string) {
    await api.post(`/admin/events/${id}/approve`);
    load();
  }

  async function reject(id: string) {
    const reason = prompt("Reason for rejection?") || "Did not meet listing guidelines";
    await api.post(`/admin/events/${id}/reject`, { reason });
    load();
  }

  if (loading) return <div className="container-page py-10 text-sm text-savanna-900/50">Loading…</div>;
  if (user?.role !== "ADMIN") {
    return <div className="container-page py-16 text-center text-sm text-savanna-900/60">Admins only.</div>;
  }

  return (
    <div className="container-page py-10">
      <h1 className="mb-6 font-display text-3xl font-bold">Pending review queue</h1>
      {events.length === 0 ? (
        <p className="text-sm text-savanna-900/50">Nothing waiting for review. 🎉</p>
      ) : (
        <div className="space-y-4">
          {events.map((e) => (
            <div key={e.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <h2 className="font-display text-lg font-semibold">{e.title}</h2>
                    {e.isFlagged && (
                      <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                        ⚠ Flagged
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-savanna-900/60">
                    {e.city}, {e.country} · {format(new Date(e.startDate), "d MMM yyyy")} · {e.priceType}
                    {e.priceType === "PAID" ? ` (${e.currency} ${Number(e.price).toLocaleString()})` : ""}
                  </p>
                  <p className="mt-1 text-xs text-savanna-900/50">
                    By {(e.organizer as any)?.organizationName || (e.organizer as any)?.name} ({(e.organizer as any)?.role})
                    {(e.organizer as any)?.isVerifiedOrganizer ? " · ✓ verified" : ""}
                  </p>
                  {e.isFlagged && <p className="mt-2 text-xs text-red-600">{e.flagReason}</p>}
                  <p className="mt-2 max-w-2xl text-sm text-savanna-900/80">{e.description}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button onClick={() => approve(e.id)} className="btn-primary !px-4 !py-1.5 text-xs">Approve</button>
                  <button onClick={() => reject(e.id)} className="btn-secondary !px-4 !py-1.5 text-xs">Reject</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
