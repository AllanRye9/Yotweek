"use client";
import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../components/Toast";
import { AdminGuard } from "../../../components/AdminGuard";

export default function AdminReportsPage() {
  const { user } = useAuth(); const toast = useToast();
  const [tab, setTab] = useState<"event"|"business">("event");
  const [reports, setReports] = useState<any[]>([]); const [fetching, setFetching] = useState(true);
  function load(t: "event"|"business") {
    setFetching(true);
    const req = t === "event" ? api.get("/reports",{params:{status:"PENDING"}}) : api.get("/reports/business",{params:{status:"PENDING"}});
    req.then(r=>setReports(r.data.reports)).finally(()=>setFetching(false));
  }
  useEffect(() => { if (user?.role==="ADMIN") load(tab); }, [user, tab]); // eslint-disable-line react-hooks/exhaustive-deps
  async function resolve(id: string, action: string) {
    try {
      if (tab === "event") await api.post(`/reports/${id}/resolve`,{action});
      else await api.post(`/reports/business/${id}/resolve`,{action});
      toast.success(action.startsWith("hide")?"Listing hidden.":"Report dismissed.");
      load(tab);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Could not resolve this report — it may have already been handled.");
      load(tab);
    }
  }
  return (
    <AdminGuard>
    <div className="animate-fade-in">
      <div className="bg-gradient-to-r from-violet-700 to-indigo-700 text-white px-6 sm:px-9 py-11"><div className="max-w-7xl mx-auto"><h1 className="font-extrabold text-2xl">User Reports</h1><p className="text-white/70 text-sm mt-1">Flagged content, spam, and abuse reported by the community.</p></div></div>
      <div className="max-w-7xl mx-auto px-6 sm:px-9 py-9">
        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab("event")} className={tab==="event"?"tab-pill-active":"tab-pill-inactive"}>🎪 Event reports</button>
          <button onClick={() => setTab("business")} className={tab==="business"?"tab-pill-active":"tab-pill-inactive"}>🏪 Business reports</button>
        </div>
        {fetching ? <p className="text-gray-400 text-sm">Loading…</p>
        : reports.length===0 ? <div className="card-base p-12 text-center"><p className="text-4xl mb-3">✅</p><p className="font-semibold text-gray-700">No open reports.</p></div>
        : <div className="space-y-4">{reports.map(r => (
            <div key={r.id} className="card-base p-5">
              <div className="flex flex-wrap items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-2 items-center mb-1">
                    <h2 className="font-bold text-gray-900">{tab==="event" ? r.event.title : r.business.name}</h2>
                    <span className="badge bg-red-100 text-red-700">🚩 {r.reason.replace(/_/g," ")}</span>
                    {(tab==="event" ? r.event.reportCount : r.business.reportCount) > 1 && <span className="badge bg-rose-100 text-rose-700">{tab==="event" ? r.event.reportCount : r.business.reportCount} total</span>}
                  </div>
                  <p className="text-xs text-gray-400 mb-1">Reported by {r.reporter.name}</p>
                  {r.details && <p className="text-sm text-gray-500 italic">&ldquo;{r.details}&rdquo;</p>}
                </div>
                <div className="flex shrink-0 flex-col gap-2">
                  <button onClick={() => resolve(r.id, tab==="event"?"hide_event":"hide_business")} className="btn-primary !px-4 !py-1.5 !text-xs">🚫 Hide</button>
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
