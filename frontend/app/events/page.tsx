"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "../../lib/api";
import { EventItem } from "../../lib/types";
import { EventCard } from "../../components/EventCard";
import { SkeletonCard } from "../../components/SkeletonCard";
import { useLocation } from "../../lib/geolocation";
import { buildProfile } from "../../lib/preferences";

const CATS = [
  { key:"",                  label:"All" },
  { key:"FESTIVAL",          label:"🎪 Festivals" },
  { key:"WILDLIFE_SAFARI",   label:"🦁 Safari" },
  { key:"CULTURAL_HERITAGE", label:"🏛️ Culture" },
  { key:"ADVENTURE_OUTDOOR", label:"⛰️ Adventure" },
  { key:"CONCERT",           label:"🎵 Concerts" },
  { key:"FOOD_DRINK",        label:"🍲 Food & Drink" },
  { key:"GUIDED_TOUR",       label:"🗺️ Tours" },
  { key:"CONFERENCE",        label:"🎤 Conferences" },
  { key:"SPORTS",            label:"⚽ Sports" },
  { key:"NIGHTLIFE",         label:"🌙 Nightlife" },
  { key:"WORKSHOP",          label:"🛠️ Workshops" },
  { key:"RELIGIOUS",         label:"🕌 Religious" },
  { key:"EXHIBITION",        label:"🖼️ Exhibitions" },
];

function Content() {
  const sp = useSearchParams();
  const { location } = useLocation();
  const profile = buildProfile();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(sp.get("search") || "");
  const [searchInput, setSearchInput] = useState(sp.get("search") || "");
  const [category, setCategory] = useState(sp.get("category") || "");
  const [scope, setScope] = useState(sp.get("scope") || "");
  const [priceType, setPriceType] = useState(sp.get("priceType") || "");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("startDate");

  // Nav/category links point at /events?category=...&scope=...&priceType=...
  // Since Next keeps this component mounted across query-only navigations,
  // the initial useState(sp.get(...)) above only fires once — without this,
  // clicking a different filter link while already on /events silently did
  // nothing. Re-sync whenever the query string itself changes.
  useEffect(() => {
    setSearch(sp.get("search") || "");
    setSearchInput(sp.get("search") || "");
    setCategory(sp.get("category") || "");
    setScope(sp.get("scope") || "");
    setPriceType(sp.get("priceType") || "");
    setPage(1);
  }, [sp]);

  useEffect(() => {
    const params: any = { pageSize: 24, page };
    if (search) params.search = search;
    if (category) params.category = category;
    if (scope) params.scope = scope;
    if (priceType) params.priceType = priceType;
    if (location.latitude && location.longitude) { params.lat = location.latitude; params.lng = location.longitude; }
    setLoading(true);
    api.get("/events", { params })
      .then(r => { setEvents(r.data.events); setTotal(r.data.total); })
      .finally(() => setLoading(false));
  }, [search, category, scope, priceType, page, sortBy, location.latitude, location.longitude]);

  const hasFilters = !!(category || scope || priceType || search);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="max-w-7xl mx-auto">
          <h1 className="font-extrabold text-2xl sm:text-3xl mb-1">Browse Events</h1>
          <p className="text-white/70 text-sm mb-5">Discover verified events near you and around the world.</p>
          <form onSubmit={e => { e.preventDefault(); setSearch(searchInput); setPage(1); }} className="flex gap-2 max-w-xl">
            <input value={searchInput} onChange={e => setSearchInput(e.target.value)}
              placeholder="Search events, destinations, tags…"
              className="input-base flex-1 !text-sm" />
            <button type="submit" className="btn-primary !px-5 !rounded-xl shrink-0">Search</button>
          </form>
          {profile.hasData && !hasFilters && (
            <p className="mt-3 text-xs text-white/50">
              💡 Showing results based on your interest in {profile.categories.slice(0,2).map(c => c.key.replace(/_/g," ").toLowerCase()).join(", ")}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 sm:px-9 py-9">
        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-5 pb-1">
          {CATS.map(c => (
            <button key={c.key} onClick={() => { setCategory(c.key); setPage(1); }}
              className={category === c.key ? "tab-pill-active" : "tab-pill-inactive"}>
              {c.label}
            </button>
          ))}
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap gap-3 mb-6 items-center">
          <select value={scope} onChange={e => { setScope(e.target.value); setPage(1); }} className="input-base !w-auto !py-2 !text-xs">
            <option value="">🌐 All scope</option>
            <option value="LOCAL">📍 Local</option>
            <option value="INTERNATIONAL">🌍 International</option>
          </select>
          <select value={priceType} onChange={e => { setPriceType(e.target.value); setPage(1); }} className="input-base !w-auto !py-2 !text-xs">
            <option value="">💰 Any price</option>
            <option value="FREE">🆓 Free only</option>
            <option value="PAID">🎫 Paid only</option>
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="input-base !w-auto !py-2 !text-xs">
            <option value="startDate">📅 Soonest first</option>
            <option value="viewCount">🔥 Most popular</option>
          </select>
          {hasFilters && (
            <button onClick={() => { setCategory(""); setScope(""); setPriceType(""); setSearch(""); setSearchInput(""); setPage(1); }}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 transition-colors">
              ✕ Clear
            </button>
          )}
          <span className="ml-auto text-xs text-gray-400 self-center">{total.toLocaleString()} result{total !== 1 ? "s" : ""}</span>
        </div>

        {loading ? (
          <div className="listing-grid">{[...Array(12)].map((_,i) => <SkeletonCard key={i} />)}</div>
        ) : events.length === 0 ? (
          <div className="card-base p-12 text-center">
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-semibold text-gray-700 mb-1">No events match your filters</p>
            <p className="text-gray-400 text-sm">Try widening your search or clearing some filters.</p>
          </div>
        ) : (
          <div className="listing-grid stagger">{events.map(e => <EventCard key={e.id} event={e} />)}</div>
        )}

        {total > 24 && (
          <div className="flex items-center justify-center gap-3 mt-10">
            <button disabled={page===1} onClick={() => setPage(p => p-1)} className="btn-secondary !px-4 !py-2 !text-xs disabled:opacity-40">← Prev</button>
            <span className="text-sm text-gray-500">Page {page} of {Math.ceil(total/24)}</span>
            <button disabled={page >= Math.ceil(total/24)} onClick={() => setPage(p => p+1)} className="btn-secondary !px-4 !py-2 !text-xs disabled:opacity-40">Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function EventsPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-10"><div className="listing-grid">{[...Array(12)].map((_,i) => <SkeletonCard key={i} />)}</div></div>}>
      <Content />
    </Suspense>
  );
}
