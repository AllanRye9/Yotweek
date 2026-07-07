"use client";
import { useEffect, useState } from "react";
import { api } from "../lib/api";

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n/1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n/1_000).toFixed(1)}K`;
  return n.toLocaleString();
}
const FALLBACK = [
  { icon:"👀", label:"Total Visitors", value:"—" },
  { icon:"📅", label:"Visitors Today", value:"—" },
  { icon:"🎉", label:"Events Held", value:"—" },
  { icon:"🟢", label:"Active Events", value:"—" },
];
export function StatsTicker() {
  const [items, setItems] = useState(FALLBACK);
  useEffect(() => {
    api.get("/stats/landing").then(r => {
      const d = r.data;
      setItems([
        { icon:"👀", label:"Total Visitors", value:fmt(d.totalVisitors) },
        { icon:"📅", label:"Visitors Today", value:fmt(d.dailyVisitors) },
        { icon:"🎉", label:"Events Held", value:fmt(d.totalEventsHeld) },
        { icon:"🟢", label:"Active Events", value:fmt(d.activeEvents) },
      ]);
    }).catch(() => {});
  }, []);
  const all = [...items, ...items];
  return (
    <div className="overflow-hidden bg-slate-950/90 border-b border-white/5 py-1">
      <div className="flex whitespace-nowrap animate-ticker" style={{width:"fit-content"}}>
        {all.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 px-6 text-[11px] font-semibold text-white/90">
            <span>{item.icon}</span>
            <span className="text-white/50">{item.label}:</span>
            <span className="text-sky-300 font-bold">{item.value}</span>
            <span className="text-white/20 ml-4">|</span>
          </span>
        ))}
      </div>
    </div>
  );
}
