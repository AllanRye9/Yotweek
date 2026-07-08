"use client";
import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../components/Toast";
import { AdminGuard } from "../../../components/AdminGuard";

export default function AdminReportsPage() {
  const { user } = useAuth(); const toast = useToast();
  const [reports, setReports] = useState<any[]>([]); const [fetching, setFetching] = useState(true);
  function load() { setFetching(true); api.get("/reports",{params:{status:"PENDING"}}).then(r=>setReports(r.data.reports)).finally(()=>setFetching(false)); }
  useEffect(() => { if (user?.role==="ADMIN") load(); }, [user]);
  async function resolve(id: string, action: string) { await api.post(`/reports/${id}/resolve`,{action}); toast.success(action==="hide_event"?"Listing hidden.":"Report dismissed."); load(); }
  return (
    <AdminGuard>
    <div className="animate-fade-in">
      <div className="bg-gradient-to-r from-violet-700 to-indigo-700 text-white px-4 sm:px-6 py-7"><div className="max-w-7xl mx-auto"><h1 className="font-extrabold text-2xl">User Reports</h1></div></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {fetching ? <p className="text-gray-400 text-sm">Loading…</p>
        : reports.length===0 ? <div className="card-base p-12 text-center"><p className="text-4xl mb-3">✅</p><p className="font-semibold text-gray-700">No open reports.</p></div>
        : <div className="space-y-4">{reports.map(r => (
            <div key={r.id} className="card-base p-5">
              <div className="flex flex-wrap items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-2 items-center mb-1">
                    <h2 className="font-bold text-gray-900">{r.event.title}</h2>
                    <span className="badge bg-red-100 text-red-700">🚩 {r.reason.replace(/_/g," ")}</span>
                    {r.event.reportCount>1 && <span className="badge bg-rose-100 text-rose-700">{r.event.reportCount} total</span>}
                  </div>
                  <p className="text-xs text-gray-400 mb-1">Reported by {r.reporter.name}</p>
                  {r.details && <p className="text-sm text-gray-500 italic">&ldquo;{r.details}&rdquo;</p>}
                </div>
                <div className="flex shrink-0 flex-col gap-2">
                  <button onClick={() => resolve(r.id,"hide_event")} className="btn-primary !px-4 !py-1.5 !text-xs">🚫 Hide</button>
                  <button onClick={() => resolve(r.id,"dismiss")} className="btn-ghost !px-4 !py-1.5 !text-xs">Dismiss</button>
                </div>
              </div>
            </div>
          ))}</div>}
      </div>
    </div>
    </AdminGuard>
  );
}
