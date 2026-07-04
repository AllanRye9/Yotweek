"use client";

import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";

export default function AdminReportsPage() {
  const { user, loading } = useAuth();
  const [reports, setReports] = useState<any[]>([]);

  function load() {
    api.get("/reports", { params: { status: "PENDING" } }).then((res) => setReports(res.data.reports));
  }

  useEffect(() => {
    if (user?.role === "ADMIN") load();
  }, [user]);

  async function resolve(id: string, action: "dismiss" | "hide_event") {
    await api.post(`/reports/${id}/resolve`, { action });
    load();
  }

  if (loading) return <div className="container-page py-10 text-sm text-savanna-900/50">Loading…</div>;
  if (user?.role !== "ADMIN") {
    return <div className="container-page py-16 text-center text-sm text-savanna-900/60">Admins only.</div>;
  }

  return (
    <div className="container-page py-10">
      <h1 className="mb-6 font-display text-3xl font-bold">Reported listings</h1>
      {reports.length === 0 ? (
        <p className="text-sm text-savanna-900/50">No open reports.</p>
      ) : (
        <div className="space-y-4">
          {reports.map((r) => (
            <div key={r.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-semibold">{r.event.title}</h2>
                  <p className="text-sm text-savanna-900/60">
                    Reason: <strong>{r.reason.replace(/_/g, " ")}</strong> · Reported by {r.reporter.name} · {r.event.reportCount} total report{r.event.reportCount === 1 ? "" : "s"}
                  </p>
                  {r.details && <p className="mt-1 text-sm text-savanna-900/70">&ldquo;{r.details}&rdquo;</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button onClick={() => resolve(r.id, "hide_event")} className="btn-primary !px-4 !py-1.5 text-xs">Hide listing</button>
                  <button onClick={() => resolve(r.id, "dismiss")} className="btn-secondary !px-4 !py-1.5 text-xs">Dismiss</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
