"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "../../lib/api";
import { Business } from "../../lib/types";
import { BusinessCard } from "../../components/BusinessCard";
import { SkeletonCard } from "../../components/SkeletonCard";
import { useLocation } from "../../lib/geolocation";

function Content() {
  const sp = useSearchParams();
  const { location } = useLocation();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(sp.get("search")||"");
  const [searchInput, setSearchInput] = useState(sp.get("search")||"");
  const [categoryId, setCategoryId] = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [sortBy, setSortBy] = useState(sp.get("sortBy") || "name");
  const [page, setPage] = useState(1);

  useEffect(() => {
    api.get("/categories").then(r => setCategories(r.data.categories)).catch(()=>{});
  }, []);

  // Nav links (e.g. /businesses?category=food) pass a category *slug*, but
  // filtering/the API works off categoryId. Flatten the tree once loaded and
  // resolve slug -> id. Also re-run on every URL change (not just once at
  // mount) so clicking a different category link while already on this page
  // actually updates the filter instead of silently doing nothing.
  useEffect(() => {
    const slug = sp.get("category");
    setSearch(sp.get("search") || "");
    setSearchInput(sp.get("search") || "");
    setSortBy(sp.get("sortBy") || "name");
    setPage(1);
    if (!slug) { setCategoryId(""); return; }
    if (categories.length === 0) return; // resolve once categories arrive
    const flatten = (nodes: any[]): any[] => nodes.flatMap(n => [n, ...flatten(n.children || [])]);
    const match = flatten(categories).find(c => c.slug === slug);
    setCategoryId(match?.id || "");
  }, [sp, categories]);

  useEffect(() => {
    const params: any = { pageSize:24, page };
    if (search) params.search = search;
    if (categoryId) params.categoryId = categoryId;
    if (priceRange) params.priceRange = priceRange;
    if (sortBy && sortBy !== "name") params.sortBy = sortBy;
    if (location.latitude && location.longitude) { params.lat=location.latitude; params.lng=location.longitude; }
    setLoading(true);
    api.get("/businesses", { params })
      .then(r => { setBusinesses(r.data.businesses); setTotal(r.data.total||0); })
      .finally(() => setLoading(false));
  }, [search, categoryId, priceRange, sortBy, page, location.latitude, location.longitude]);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="max-w-7xl mx-auto">
          <h1 className="font-extrabold text-2xl sm:text-3xl mb-1">Businesses & Places</h1>
          <p className="text-white/70 text-sm mb-5">Restaurants, hotels, tour operators, and more — verified and reviewed.</p>
          <form onSubmit={e => { e.preventDefault(); setSearch(searchInput); setPage(1); }} className="flex gap-2 max-w-xl">
            <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Search businesses…" className="input-base flex-1 !text-sm" />
            <button type="submit" className="btn-primary !px-5 !rounded-xl shrink-0">Search</button>
          </form>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 sm:px-9 py-9">
        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-5 pb-1">
          <button onClick={() => setCategoryId("")} className={!categoryId?"tab-pill-active":"tab-pill-inactive"}>All</button>
          {categories.slice(0,12).map((c:any) => (
            <button key={c.id} onClick={() => setCategoryId(c.id)} className={categoryId===c.id?"tab-pill-active":"tab-pill-inactive"}>
              {c.icon && <span className="mr-1">{c.icon}</span>}{c.name}
            </button>
          ))}
        </div>
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6 items-center">
          <select value={priceRange} onChange={e => setPriceRange(e.target.value)} className="input-base !w-auto !py-2 !text-xs">
            <option value="">💰 Any price range</option>
            <option value="BUDGET">$ Budget</option>
            <option value="MODERATE">$$ Moderate</option>
            <option value="EXPENSIVE">$$$ Expensive</option>
            <option value="LUXURY">$$$$ Luxury</option>
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="input-base !w-auto !py-2 !text-xs">
            <option value="name">🔤 A–Z</option>
            <option value="newest">🆕 Newest</option>
            <option value="viewCount">🔥 Most popular</option>
          </select>
          {(search||categoryId||priceRange) && (
            <button onClick={() => { setSearch(""); setSearchInput(""); setCategoryId(""); setPriceRange(""); setPage(1); }}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100">✕ Clear</button>
          )}
          <span className="ml-auto text-xs text-gray-400">{total.toLocaleString()} result{total!==1?"s":""}</span>
        </div>
        {loading ? (
          <div className="listing-grid">{[...Array(12)].map((_,i) => <SkeletonCard key={i} />)}</div>
        ) : businesses.length === 0 ? (
          <div className="card-base p-12 text-center"><p className="text-4xl mb-3">🏪</p><p className="font-semibold text-gray-700">No businesses found</p></div>
        ) : (
          <div className="listing-grid stagger">{businesses.map(b => <BusinessCard key={b.id} business={b} />)}</div>
        )}
        {total > 24 && (
          <div className="flex items-center justify-center gap-3 mt-10">
            <button disabled={page===1} onClick={() => setPage(p=>p-1)} className="btn-secondary !px-4 !py-2 !text-xs disabled:opacity-40">← Prev</button>
            <span className="text-sm text-gray-500">Page {page} of {Math.ceil(total/24)}</span>
            <button disabled={page>=Math.ceil(total/24)} onClick={() => setPage(p=>p+1)} className="btn-secondary !px-4 !py-2 !text-xs disabled:opacity-40">Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}
export default function BusinessesPage() {
  return <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-10"><div className="listing-grid">{[...Array(12)].map((_,i) => <SkeletonCard key={i} />)}</div></div>}><Content /></Suspense>;
}
