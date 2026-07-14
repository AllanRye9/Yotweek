"use client";
import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { AdminGuard } from "../../../components/AdminGuard";
import { countryFlag } from "../../../lib/currency";

interface AnalyticsData {
  windowDays: number;
  totalVisits: number;
  totalUsers: number;
  dailyVisits: { date: string; count: number }[];
  countries: { country: string; count: number }[];
  devices: { device: string; count: number }[];
  peakHours: { hour: number; count: number }[];
  contentActivity: {
    events: { date: string; count: number }[];
    businesses: { date: string; count: number }[];
    communities: { date: string; count: number }[];
  };
}

const DEVICE_ICON: Record<string, string> = { mobile: "📱", tablet: "📟", desktop: "🖥️" };

function BarRow({ label, count, max, icon }: { label: string; count: number; max: number; icon?: string }) {
  const pct = max > 0 ? Math.max((count / max) * 100, 3) : 0;
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="w-32 shrink-0 text-xs font-medium text-gray-600 truncate flex items-center gap-1.5">{icon} {label}</span>
      <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 shrink-0 text-xs font-bold text-gray-700 text-right">{count}</span>
    </div>
  );
}

function MiniLineChart({ points }: { points: { date: string; count: number }[] }) {
  if (points.length === 0) return <p className="text-xs text-gray-400 py-6 text-center">No data in this window yet.</p>;
  const max = Math.max(...points.map(p => p.count), 1);
  const w = 100, h = 32;
  const stepX = points.length > 1 ? w / (points.length - 1) : 0;
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${i * stepX} ${h - (p.count / max) * h}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-20" preserveAspectRatio="none">
      <path d={path} fill="none" stroke="#0284c7" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default function AdminAnalyticsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api.get("/admin/analytics/traffic", { params: { days } }).then(r => setData(r.data)).finally(() => setLoading(false));
  }
  useEffect(() => { if (user?.role === "ADMIN") load(); }, [user, days]); // eslint-disable-line react-hooks/exhaustive-deps

  function exportCsv() {
    api.get("/admin/analytics/traffic/export", { params: { days }, responseType: "blob" }).then(r => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(r.data);
      a.download = `yotweek-analytics-${days}d.csv`;
      a.click();
    });
  }

  const maxCountry = data ? Math.max(...data.countries.map(c => c.count), 1) : 1;
  const maxDevice = data ? Math.max(...data.devices.map(d => d.count), 1) : 1;
  const maxHour = data ? Math.max(...data.peakHours.map(h => h.count), 1) : 1;

  return (
    <AdminGuard>
      <div className="animate-fade-in">
        <div className="bg-gradient-to-r from-violet-700 to-indigo-700 text-white px-6 sm:px-9 py-11">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-extrabold text-2xl">Analytics</h1>
              <p className="text-white/70 text-sm mt-1">Traffic, geography, devices, and platform activity.</p>
            </div>
            <div className="flex gap-2">
              <select value={days} onChange={e => setDays(Number(e.target.value))} className="input-base !w-auto !bg-white/10 !border-white/30 !text-white !py-2">
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
              <button onClick={exportCsv} className="btn-secondary !bg-white/10 !border-white/30 !text-white hover:!bg-white/20 !py-2">⬇ Export CSV</button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 sm:px-9 py-9">
          {loading || !data ? (
            <p className="text-gray-400 text-sm">Loading…</p>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Visits", value: data.totalVisits, icon: "👀" },
                  { label: "Total users", value: data.totalUsers, icon: "👥" },
                  { label: "Countries reached", value: data.countries.length, icon: "🌍" },
                  { label: "Window", value: `${data.windowDays}d`, icon: "📅" },
                ].map(c => (
                  <div key={c.label} className="card-base p-4 text-center">
                    <p className="text-2xl mb-1">{c.icon}</p>
                    <p className="font-extrabold text-xl text-gray-900">{c.value}</p>
                    <p className="text-[11px] text-gray-400">{c.label}</p>
                  </div>
                ))}
              </div>

              <div className="card-base p-5">
                <h2 className="font-bold text-gray-900 text-sm mb-3">Visits over time</h2>
                <MiniLineChart points={data.dailyVisits} />
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                <div className="card-base p-5">
                  <h2 className="font-bold text-gray-900 text-sm mb-3">🌍 Countries</h2>
                  {data.countries.length === 0 ? <p className="text-xs text-gray-400">No geolocated visits yet.</p> :
                    data.countries.slice(0, 10).map(c => (
                      <BarRow key={c.country} label={c.country} icon={countryFlag(c.country)} count={c.count} max={maxCountry} />
                    ))}
                </div>
                <div className="card-base p-5">
                  <h2 className="font-bold text-gray-900 text-sm mb-3">📱 Devices</h2>
                  {data.devices.map(d => (
                    <BarRow key={d.device} label={d.device} icon={DEVICE_ICON[d.device] || "🖥️"} count={d.count} max={maxDevice} />
                  ))}
                </div>
              </div>

              <div className="card-base p-5">
                <h2 className="font-bold text-gray-900 text-sm mb-3">🕒 Peak usage hours (UTC)</h2>
                <div className="flex items-end gap-1 h-24">
                  {data.peakHours.map(h => (
                    <div key={h.hour} className="flex-1 flex flex-col items-center gap-1" title={`${h.hour}:00 — ${h.count} visits`}>
                      <div className="w-full bg-gradient-to-t from-sky-500 to-indigo-400 rounded-t" style={{ height: `${Math.max((h.count / maxHour) * 80, 2)}px` }} />
                      {h.hour % 3 === 0 && <span className="text-[8px] text-gray-400">{h.hour}</span>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                {(["events", "businesses", "communities"] as const).map(k => (
                  <div key={k} className="card-base p-5">
                    <h2 className="font-bold text-gray-900 text-sm mb-2 capitalize">{k} created</h2>
                    <p className="font-extrabold text-2xl text-sky-700 mb-2">{data.contentActivity[k].reduce((s, d) => s + d.count, 0)}</p>
                    <MiniLineChart points={data.contentActivity[k]} />
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-gray-400 text-center">
                Analytics use hashed visitor identifiers and country-level geolocation only — raw IP addresses are never stored or shown, in line with data-privacy best practice.
              </p>
            </div>
          )}
        </div>
      </div>
    </AdminGuard>
  );
}
