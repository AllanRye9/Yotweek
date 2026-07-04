"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "../../lib/api";
import { EventItem } from "../../lib/types";
import { EventCard } from "../../components/EventCard";
import { useLocation } from "../../lib/geolocation";

const CATEGORIES = [
  "FESTIVAL", "CONFERENCE", "CONCERT", "SPORTS", "CULTURAL_HERITAGE", "NIGHTLIFE",
  "WORKSHOP", "GUIDED_TOUR", "ADVENTURE_OUTDOOR", "WILDLIFE_SAFARI", "FOOD_DRINK",
  "RELIGIOUS", "EXHIBITION", "OTHER",
];

function BrowseContent() {
  const searchParams = useSearchParams();
  const { location } = useLocation();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [scope, setScope] = useState(searchParams.get("scope") || "");
  const [priceType, setPriceType] = useState("");
  const [when, setWhen] = useState<"upcoming" | "past">("upcoming");

  useEffect(() => {
    const params: any = { pageSize: 24, when };
    if (search) params.search = search;
    if (category) params.category = category;
    if (scope) params.scope = scope;
    if (priceType) params.priceType = priceType;
    if (location.latitude && location.longitude) {
      params.lat = location.latitude;
      params.lng = location.longitude;
    }
    setLoading(true);
    api.get("/events", { params }).then((res) => setEvents(res.data.events)).finally(() => setLoading(false));
  }, [search, category, scope, priceType, when, location.latitude, location.longitude]);

  return (
    <div className="container-page py-10">
      <h1 className="mb-6 font-display text-3xl font-bold">Browse events & tourism opportunities</h1>

      <div className="mb-6 inline-flex rounded-full border border-savanna-900/15 bg-white p-1 text-sm font-medium">
        <button
          onClick={() => setWhen("upcoming")}
          className={`rounded-full px-4 py-1.5 ${when === "upcoming" ? "bg-sunset-600 text-white" : "text-savanna-900/70"}`}
        >
          Upcoming
        </button>
        <button
          onClick={() => setWhen("past")}
          className={`rounded-full px-4 py-1.5 ${when === "past" ? "bg-sunset-600 text-white" : "text-savanna-900/70"}`}
        >
          Past events
        </button>
      </div>

      <div className="mb-8 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, place, or tag…"
          className="min-w-[220px] flex-1 rounded-full border border-savanna-900/15 px-4 py-2 text-sm"
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-full border border-savanna-900/15 px-4 py-2 text-sm">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
          ))}
        </select>
        <select value={scope} onChange={(e) => setScope(e.target.value)} className="rounded-full border border-savanna-900/15 px-4 py-2 text-sm">
          <option value="">Local & International</option>
          <option value="LOCAL">Local</option>
          <option value="INTERNATIONAL">International</option>
        </select>
        <select value={priceType} onChange={(e) => setPriceType(e.target.value)} className="rounded-full border border-savanna-900/15 px-4 py-2 text-sm">
          <option value="">Free & Paid</option>
          <option value="FREE">Free only</option>
          <option value="PAID">Paid only</option>
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-savanna-900/50">Loading…</p>
      ) : events.length === 0 ? (
        <p className="text-sm text-savanna-900/50">No events match your filters yet. Try widening your search.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function EventsPage() {
  return (
    <Suspense fallback={<div className="container-page py-10 text-sm text-savanna-900/50">Loading…</div>}>
      <BrowseContent />
    </Suspense>
  );
}
