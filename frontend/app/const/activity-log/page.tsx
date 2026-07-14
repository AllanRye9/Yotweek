"use client";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { api } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { AdminGuard } from "../../../components/AdminGuard";

interface LogEntry {
  id: string; action: string; targetType: string; targetId: string;
  targetLabel: string | null; details: string | null; createdAt: string;
  admin: { id: string; name: string };
}

const ACTION_COLOR: Record<string, string> = {
  approve: "bg-emerald-100 text-emerald-700", verify: "bg-emerald-100 text-emerald-700",
  reject: "bg-red-100 text-red-700", delete: "bg-red-100 text-red-700", suspend: "bg-red-100 text-red-700",
  hide: "bg-amber-100 text-amber-700", unpublish: "bg-amber-100 text-amber-700", unverify: "bg-amber-100 text-amber-700",
  edit: "bg-sky-100 text-sky-700", change_role: "bg-sky-100 text-sky-700",
};

export default function AdminActivityLogPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [targetType, setTargetType] = useState("");
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  function load() {
    setLoading(true);
    api.get("/admin/activity-log", { params: { targetType: targetType || undefined, action: action || undefined, page, pageSize } })
      .then(r => { setLogs(r.data.logs); setTotal(r.data.total); })
      .finally(() => setLoading(false));
  }
  useEffect(() => { if (user?.role === "ADMIN") load(); }, [user, targetType, action, page]); // eslint-disable-line react-hooks/exhaustive-deps

  function exportCsv() {
    api.get("/admin/activity-log/export", { params: { targetType: targetType || undefined, action: action || undefined }, responseType: "blob" }).then(r => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(r.data);
      a.download = "yotweek-activity-log.csv";
      a.click();
    });
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <AdminGuard>
      <div className="animate-fade-in">
        <div className="bg-gradient-to-r from-violet-700 to-indigo-700 text-white px-6 sm:px-9 py-11">
          <div className="max-w-7xl mx-auto">
            <h1 className="font-extrabold text-2xl">Activity Log</h1>
            <p className="text-white/70 text-sm mt-1">Every moderation action, who did it, and when.</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 sm:px-9 py-9">
          <div className="flex flex-wrap gap-2 mb-6">
            <select value={targetType} onChange={e => { setTargetType(e.target.value); setPage(1); }} className="input-base !w-auto">
              <option value="">All content types</option>
              {["event", "business", "community", "user", "post"].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={action} onChange={e => { setAction(e.target.value); setPage(1); }} className="input-base !w-auto">
              <option value="">All actions</option>
              {["approve", "reject", "hide", "edit", "delete", "suspend", "unsuspend", "verify", "unverify", "change_role", "unpublish"].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <button onClick={exportCsv} className="btn-secondary !px-5">⬇ Export CSV</button>
          </div>

          {loading ? (
            <p className="text-gray-400 text-sm">Loading…</p>
          ) : logs.length === 0 ? (
            <div className="card-base p-12 text-center"><p className="text-4xl mb-3">🕒</p><p className="font-semibold text-gray-700">No activity recorded yet.</p></div>
          ) : (
            <>
              <div className="card-base overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-[11px] uppercase tracking-wide text-gray-400">
                    <tr>
                      <th className="px-4 py-2.5">When</th>
                      <th className="px-4 py-2.5">Admin</th>
                      <th className="px-4 py-2.5">Action</th>
                      <th className="px-4 py-2.5">Target</th>
                      <th className="px-4 py-2.5">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {logs.map(l => (
                      <tr key={l.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-2.5 text-xs text-gray-400 whitespace-nowrap">{format(new Date(l.createdAt), "d MMM, HH:mm")}</td>
                        <td className="px-4 py-2.5 font-medium text-gray-700">{l.admin.name}</td>
                        <td className="px-4 py-2.5"><span className={`badge ${ACTION_COLOR[l.action] || "bg-gray-100 text-gray-600"}`}>{l.action}</span></td>
                        <td className="px-4 py-2.5 text-gray-600">{l.targetType}: {l.targetLabel || l.targetId}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-400 max-w-xs truncate">{l.details || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-5">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="btn-ghost !px-3 !py-1.5 !text-xs disabled:opacity-30">← Prev</button>
                  <span className="text-xs text-gray-400">Page {page} of {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="btn-ghost !px-3 !py-1.5 !text-xs disabled:opacity-30">Next →</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AdminGuard>
  );
}
