"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

interface Itinerary {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  items: any[];
}

export default function ItineraryPage() {
  const { user, loading } = useAuth();
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", startDate: "", endDate: "" });

  function load() {
    api.get("/itineraries").then((res) => setItineraries(res.data.itineraries));
  }

  useEffect(() => {
    if (user) load();
  }, [user]);

  async function createItinerary(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post("/itineraries", form);
      setForm({ title: "", startDate: "", endDate: "" });
      load();
    } finally {
      setCreating(false);
    }
  }

  async function addCustomStop(itineraryId: string, day: number) {
    const customTitle = prompt("What's the plan for this stop? (e.g. Lunch at a local restaurant)");
    if (!customTitle) return;
    await api.post(`/itineraries/${itineraryId}/items`, { customTitle, day });
    load();
  }

  async function removeItem(itemId: string) {
    await api.delete(`/itineraries/items/${itemId}`);
    load();
  }

  if (loading) return <div className="container-page py-10 text-sm text-savanna-900/50">Loading…</div>;
  if (!user) {
    return (
      <div className="container-page py-16 text-center">
        <h1 className="font-display text-2xl font-bold">Sign in to build an itinerary</h1>
        <a href="/auth/login" className="btn-primary mt-6 inline-flex">Sign in</a>
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      <h1 className="mb-2 font-display text-3xl font-bold">Itinerary builder</h1>
      <p className="mb-8 text-sm text-savanna-900/60">Plan your trip day by day — add events you&apos;ve found, or your own custom stops.</p>

      <form onSubmit={createItinerary} className="card mb-10 flex flex-wrap items-end gap-3 p-5">
        <label className="flex-1 min-w-[160px]">
          <span className="mb-1 block text-xs font-medium">Trip title</span>
          <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded-lg border border-savanna-900/15 px-3 py-2 text-sm" placeholder="e.g. Northern Uganda Weekend" />
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium">Start</span>
          <input required type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="rounded-lg border border-savanna-900/15 px-3 py-2 text-sm" />
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium">End</span>
          <input required type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="rounded-lg border border-savanna-900/15 px-3 py-2 text-sm" />
        </label>
        <button type="submit" disabled={creating} className="btn-primary">New itinerary</button>
      </form>

      <div className="space-y-8">
        {itineraries.map((it) => {
          const dayCount = Math.max(
            1,
            Math.ceil((new Date(it.endDate).getTime() - new Date(it.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
          );
          const days = Array.from({ length: dayCount }, (_, i) => i + 1);
          return (
            <div key={it.id} className="card p-5">
              <h2 className="mb-4 font-display text-xl font-semibold">{it.title}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {days.map((day) => (
                  <div key={day} className="rounded-xl border border-black/5 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-semibold">Day {day}</p>
                      <button onClick={() => addCustomStop(it.id, day)} className="text-xs text-sunset-600 underline">+ Add stop</button>
                    </div>
                    <div className="space-y-2">
                      {it.items.filter((item) => item.day === day).map((item) => (
                        <div key={item.id} className="flex items-center justify-between rounded-lg bg-orange-50 px-3 py-2 text-xs">
                          <span>{item.event?.title || item.customTitle}</span>
                          <button onClick={() => removeItem(item.id)} className="text-savanna-900/40">✕</button>
                        </div>
                      ))}
                      {it.items.filter((item) => item.day === day).length === 0 && (
                        <p className="text-xs text-savanna-900/40">Nothing planned yet</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {itineraries.length === 0 && <p className="text-sm text-savanna-900/50">Create your first itinerary above.</p>}
      </div>
    </div>
  );
}
