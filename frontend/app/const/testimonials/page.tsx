"use client";
import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../components/Toast";
import { AdminGuard } from "../../../components/AdminGuard";

export default function AdminTestimonialsPage() {
  const { user } = useAuth(); const toast = useToast();
  const [items, setItems] = useState<any[]>([]); const [fetching, setFetching] = useState(true);
  function load() { setFetching(true); api.get("/admin/testimonials/pending").then(r=>setItems(r.data.testimonials)).finally(()=>setFetching(false)); }
  useEffect(() => { if (user?.role==="ADMIN") load(); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps
  async function approve(id: string, isFeatured: boolean) { await api.post(`/admin/testimonials/${id}/approve`, { isFeatured }); toast.success("Approved!"); load(); }
  async function reject(id: string) { await api.post(`/admin/testimonials/${id}/reject`); toast.info("Rejected."); load(); }
  return (
    <AdminGuard>
    <div className="animate-fade-in">
      <div className="bg-gradient-to-r from-violet-700 to-indigo-700 text-white px-6 sm:px-9 py-11"><div className="max-w-7xl mx-auto"><h1 className="font-extrabold text-2xl">Testimonials</h1></div></div>
      <div className="max-w-7xl mx-auto px-6 sm:px-9 py-9">
        {fetching ? <p className="text-gray-400 text-sm">Loading…</p>
        : items.length===0 ? <div className="card-base p-12 text-center"><p className="text-4xl mb-3">💬</p><p className="font-semibold text-gray-700">No testimonials awaiting review.</p></div>
        : <div className="space-y-4">{items.map(t => (
            <div key={t.id} className="card-base p-5">
              <div className="flex flex-wrap items-start gap-4">
                <div className="flex-1 min-w-0">
                  {t.rating && <p className="text-amber-500 mb-1">{"★".repeat(t.rating)}{"☆".repeat(5-t.rating)}</p>}
                  <p className="text-sm text-gray-700">&ldquo;{t.content}&rdquo;</p>
                  <p className="text-xs text-gray-400 mt-2">— {t.user?.name} ({t.user?.email})</p>
                </div>
                <div className="flex shrink-0 flex-col gap-2">
                  <button onClick={() => approve(t.id, true)} className="btn-primary !px-4 !py-1.5 !text-xs">✓ Approve &amp; feature</button>
                  <button onClick={() => approve(t.id, false)} className="btn-secondary !px-4 !py-1.5 !text-xs">✓ Approve only</button>
                  <button onClick={() => reject(t.id)} className="btn-danger !px-4 !py-1.5 !text-xs">✕ Reject</button>
                </div>
              </div>
            </div>
          ))}</div>}
      </div>
    </div>
    </AdminGuard>
  );
}
