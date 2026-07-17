"use client";
import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../components/Toast";
import { AdminGuard } from "../../../components/AdminGuard";

export default function AdminReviewsPage() {
  const { user } = useAuth(); const toast = useToast();
  const [tab, setTab] = useState<"event"|"business">("event");
  const [reviews, setReviews] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);

  function load(t: "event"|"business") {
    setFetching(true);
    api.get(t === "event" ? "/admin/reviews/pending" : "/admin/business-reviews/pending")
      .then(r => setReviews(r.data.reviews))
      .finally(() => setFetching(false));
  }
  useEffect(() => { if (user?.role === "ADMIN") load(tab); }, [user, tab]); // eslint-disable-line react-hooks/exhaustive-deps

  async function act(id: string, status: "APPROVED"|"REJECTED") {
    try {
      const path = tab === "event" ? `/admin/reviews/${id}` : `/admin/business-reviews/${id}`;
      await api.put(path, { status });
      toast.success(status === "APPROVED" ? "Review approved." : "Review rejected.");
      load(tab);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Could not update this review — it may no longer exist.");
      load(tab);
    }
  }
  async function remove(id: string) {
    if (!confirm("Delete this review permanently?")) return;
    try {
      const path = tab === "event" ? `/admin/reviews/${id}` : `/admin/business-reviews/${id}`;
      await api.delete(path);
      toast.warning("Review deleted.");
      load(tab);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Could not delete this review — it may already be gone.");
      load(tab);
    }
  }

  return (
    <AdminGuard>
    <div className="animate-fade-in">
      <div className="bg-gradient-to-r from-violet-700 to-indigo-700 text-white px-6 sm:px-9 py-11"><div className="max-w-7xl mx-auto"><h1 className="font-extrabold text-2xl">Review Moderation</h1><p className="text-white/70 text-sm mt-1">Approve, reject, or remove reviews left on events and businesses.</p></div></div>
      <div className="max-w-7xl mx-auto px-6 sm:px-9 py-9">
        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab("event")} className={tab==="event"?"tab-pill-active":"tab-pill-inactive"}>🎪 Event reviews</button>
          <button onClick={() => setTab("business")} className={tab==="business"?"tab-pill-active":"tab-pill-inactive"}>🏪 Business reviews</button>
        </div>
        {fetching ? <p className="text-gray-400 text-sm">Loading…</p>
        : reviews.length===0 ? <div className="card-base p-12 text-center"><p className="text-4xl mb-3">✅</p><p className="font-semibold text-gray-700">Nothing pending.</p></div>
        : <div className="space-y-3">{reviews.map((r: any) => (
            <div key={r.id} className="card-base p-4 flex flex-wrap items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-amber-500 text-sm">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                  <span className="text-xs text-gray-400">by {r.user?.name}</span>
                </div>
                <p className="text-xs text-gray-400 mb-1">on <strong>{tab==="event" ? r.event?.title : r.business?.name}</strong></p>
                {r.comment && <p className="text-sm text-gray-600 italic">&ldquo;{r.comment}&rdquo;</p>}
              </div>
              <div className="flex shrink-0 gap-2">
                <button onClick={() => act(r.id, "APPROVED")} className="btn-primary !px-4 !py-1.5 !text-xs">✓ Approve</button>
                <button onClick={() => act(r.id, "REJECTED")} className="btn-danger !px-4 !py-1.5 !text-xs">✕ Reject</button>
                <button onClick={() => remove(r.id)} className="btn-ghost !px-4 !py-1.5 !text-xs">🗑 Delete</button>
              </div>
            </div>
          ))}</div>}
      </div>
    </div>
    </AdminGuard>
  );
}
