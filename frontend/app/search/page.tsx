"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "../../lib/api";
import { EventCard } from "../../components/EventCard";
import { SkeletonCard } from "../../components/SkeletonCard";

const CATS = ["FESTIVAL","CONFERENCE","CONCERT","SPORTS","CULTURAL_HERITAGE","NIGHTLIFE",
  "WORKSHOP","GUIDED_TOUR","ADVENTURE_OUTDOOR","WILDLIFE_SAFARI","FOOD_DRINK","RELIGIOUS","EXHIBITION","OTHER"];

function SearchContent() {
  const sp = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState(sp.get("q") || "");
  const [input, setInput] = useState(sp.get("q") || "");
  const [results, setResults] = useState<{events:any[];businesses:any[];posts:any[]}>({ events:[], businesses:[], posts:[] });
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"events"|"businesses"|"posts">("events");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [priceType, setPriceType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const activeFilterCount = [category, city, priceType, dateFrom, dateTo].filter(Boolean).length;

  // The Navbar search box always router.push()es to /search?q=..., which
  // keeps this component mounted rather than remounting it — so without
  // this, searching again while already on /search silently did nothing.
  useEffect(() => {
    const urlQ = sp.get("q") || "";
    setQ(urlQ);
    setInput(urlQ);
  }, [sp]);

  useEffect(() => {
    if (!q || q.length < 2) return;
    setLoading(true);
    const params: any = { q };
    if (category) params.category = category;
    if (city) params.city = city;
    if (priceType) params.priceType = priceType;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    api.get("/search", { params }).then(r => setResults(r.data)).finally(() => setLoading(false));
  }, [q, category, city, priceType, dateFrom, dateTo]);

  const total = results.events.length + results.businesses.length + results.posts.length;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="max-w-7xl mx-auto">
          <h1 className="font-extrabold text-2xl sm:text-3xl mb-4">Search yotweek</h1>
          <form onSubmit={e => { e.preventDefault(); setQ(input); router.push(`/search?q=${encodeURIComponent(input)}`); }} className="flex gap-2 max-w-xl">
            <input value={input} onChange={e => setInput(e.target.value)} placeholder='Search events, businesses, destinations… (try "exact phrase")' autoFocus className="input-base flex-1" />
            <button type="submit" className="btn-primary !px-6 !rounded-xl shrink-0">Search</button>
            <button type="button" onClick={() => setFiltersOpen(o => !o)}
              className={`btn-secondary !px-4 !rounded-xl shrink-0 relative ${filtersOpen ? "!bg-white/20 !text-white !border-white/40" : ""}`}>
              ⚙️ Filters{activeFilterCount > 0 && <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-sky-500 text-white text-[10px]">{activeFilterCount}</span>}
            </button>
          </form>
          {filtersOpen && (
            <div className="mt-3 max-w-3xl grid grid-cols-2 sm:grid-cols-5 gap-2 animate-fade-in">
              <select value={category} onChange={e => setCategory(e.target.value)} className="input-base !py-2 !text-xs !bg-white/95">
                <option value="">Any category</option>
                {CATS.map(c => <option key={c} value={c}>{c.replace(/_/g," ")}</option>)}
              </select>
              <input value={city} onChange={e => setCity(e.target.value)} placeholder="City" className="input-base !py-2 !text-xs !bg-white/95" />
              <select value={priceType} onChange={e => setPriceType(e.target.value)} className="input-base !py-2 !text-xs !bg-white/95">
                <option value="">Free or paid</option>
                <option value="FREE">Free</option>
                <option value="PAID">Paid</option>
              </select>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input-base !py-2 !text-xs !bg-white/95" />
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input-base !py-2 !text-xs !bg-white/95" />
            </div>
          )}
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 sm:px-9 py-9">
        {q && !loading && <p className="text-sm text-gray-500 mb-5">{total===0?`No results for "${q}"`:`${total} result${total!==1?"s":""} for "${q}"`}</p>}
        {q && (
          <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
            {(["events","businesses","posts"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} className={tab===t?"tab-pill-active":"tab-pill-inactive"}>
                {t==="events"?"🎪":t==="businesses"?"🏪":"✍️"} {t.charAt(0).toUpperCase()+t.slice(1)} ({results[t].length})
              </button>
            ))}
          </div>
        )}
        {loading ? (
          <div className="listing-grid">{[...Array(8)].map((_,i) => <SkeletonCard key={i} />)}</div>
        ) : !q ? (
          <div className="card-base p-12 text-center">
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-semibold text-gray-700 mb-1">Search across everything</p>
            <p className="text-gray-400 text-sm">Events, businesses, travel posts — all in one place.</p>
          </div>
        ) : tab==="events" ? (
          results.events.length ? <div className="listing-grid stagger">{results.events.map(e => <EventCard key={e.id} event={e} />)}</div>
          : <p className="text-gray-400 text-sm py-9">No events found for &ldquo;{q}&rdquo;.</p>
        ) : tab==="businesses" ? (
          results.businesses.length ? (
            <div className="listing-grid stagger">
              {results.businesses.map((b:any) => (
                <Link key={b.id} href={`/businesses/${b.id}`} className="card-base card-hover overflow-hidden group">
                  <div className="aspect-[4/3] bg-slate-100 flex items-center justify-center text-4xl">🏪</div>
                  <div className="p-3"><h3 className="font-bold text-sm group-hover:text-sky-600 transition-colors">{b.name}</h3><p className="text-xs text-gray-400">📍 {b.city}, {b.country}</p></div>
                </Link>
              ))}
            </div>
          ) : <p className="text-gray-400 text-sm py-9">No businesses found for &ldquo;{q}&rdquo;.</p>
        ) : (
          results.posts.length ? (
            <div className="listing-grid-3 stagger">
              {results.posts.map((p:any) => (
                <Link key={p.id} href={`/blog/${p.slug}`} className="card-base card-hover overflow-hidden group">
                  <div className="aspect-[16/9] bg-slate-100 flex items-center justify-center text-3xl">✍️</div>
                  <div className="p-4"><h3 className="font-bold text-sm line-clamp-2 group-hover:text-sky-600 transition-colors">{p.title}</h3></div>
                </Link>
              ))}
            </div>
          ) : <p className="text-gray-400 text-sm py-9">No posts found for &ldquo;{q}&rdquo;.</p>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-10"><div className="listing-grid">{[...Array(8)].map((_,i) => <SkeletonCard key={i} />)}</div></div>}>
      <SearchContent />
    </Suspense>
  );
}
