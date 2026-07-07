"use client";
import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../components/Toast";

export default function AdminBusinessesPage() {
  const { user, loading } = useAuth(); const toast = useToast();
  const [businesses, setBusinesses] = useState<any[]>([]); const [fetching, setFetching] = useState(true);
  const [tab, setTab] = useState<"pending"|"flagged">("pending");
  function load(t: "pending"|"flagged") { setFetching(true); api.get(t==="flagged"?"/admin/businesses/flagged":"/admin/businesses/pending").then(r=>setBusinesses(r.data.businesses)).finally(()=>setFetching(false)); }
  useEffect(() => { if (user?.role==="ADMIN") load(tab); }, [user,tab]);
  async function approve(id: string) { await api.post(`/admin/businesses/${id}/approve`); toast.success("Approved!"); load(tab); }
  async function reject(id: string) { const r=prompt("Reason?")||"Did not meet guidelines"; await api.post(`/admin/businesses/${id}/reject`,{reason:r}); toast.info("Rejected."); load(tab); }
  async function hide(id: string) { await api.post(`/admin/businesses/${id}/hide`); toast.warning("Hidden."); load(tab); }
  if (loading) return null;
  if (user?.role!=="ADMIN") return <div className="max-w-7xl mx-auto px-4 py-16 text-center text-gray-400">Admins only.</div>;
  return (
    <div className="animate-fade-in">
      <div className="bg-gradient-to-r from-violet-700 to-indigo-700 text-white px-4 sm:px-6 py-7"><div className="max-w-7xl mx-auto"><h1 className="font-extrabold text-2xl">Business Review Queue</h1></div></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex gap-2 mb-6">
          {(["pending","flagged"] as const).map(t => <button key={t} onClick={() => setTab(t)} className={tab===t?"tab-pill-active":"tab-pill-inactive"}>{t==="pending"?"⏳ Pending":"⚠️ Flagged"}</button>)}
        </div>
        {fetching ? <p className="text-gray-400 text-sm">Loading…</p>
        : businesses.length===0 ? <div className="card-base p-12 text-center"><p className="text-4xl mb-3">🏪</p><p className="font-semibold text-gray-700">Queue is empty!</p></div>
        : <div className="space-y-4">{businesses.map(b => (
            <div key={b.id} className="card-base p-5">
              <div className="flex flex-wrap items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h2 className="font-extrabold text-gray-900">{b.name}</h2>
                    {b.isFlagged && <span className="badge bg-red-100 text-red-700">⚠️ Flagged</span>}
                    {b.reportCount>0 && <span className="badge bg-rose-100 text-rose-700">🚩 {b.reportCount} reports</span>}
                  </div>
                  <p className="text-sm text-gray-400 mb-1">{b.city}, {b.country} · <strong>{b.category?.name}</strong>{b.priceRange?` · ${b.priceRange}`:""}</p>
                  <p className="text-xs text-gray-300 mb-2">By {b.owner?.organizationName||b.owner?.name} · {b.owner?.role}{b.owner?.isVerifiedOrganizer?" · ✓ verified":""}</p>
                  {b.isFlagged && b.flagReason && <p className="text-xs text-red-500 bg-red-50 px-3 py-1.5 rounded-lg mb-2">⚠️ {b.flagReason}</p>}
                  <p className="text-sm text-gray-500 line-clamp-2">{b.description}</p>
                </div>
                <div className="flex shrink-0 flex-col gap-2">
                  <button onClick={() => approve(b.id)} className="btn-primary !px-4 !py-1.5 !text-xs">✓ Approve</button>
                  <button onClick={() => reject(b.id)} className="btn-danger !px-4 !py-1.5 !text-xs">✕ Reject</button>
                  <button onClick={() => hide(b.id)} className="btn-ghost !px-4 !py-1.5 !text-xs">🚫 Hide</button>
                </div>
              </div>
            </div>
          ))}</div>}
      </div>
    </div>
  );
}
