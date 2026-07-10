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
    <div className="relative overflow-hidden bg-gradient-to-r from-indigo-950 via-slate-950 to-sky-950 border-b border-sky-400/10 py-1.5 group">
      {/* subtle animated sheen */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-sky-400/5 to-transparent bg-[length:200%_100%] animate-[gradientShift_6s_ease_infinite]" />
      {/* edge fade so the loop feels seamless rather than clipped */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-10 sm:w-16 bg-gradient-to-r from-slate-950 to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-10 sm:w-16 bg-gradient-to-l from-slate-950 to-transparent z-10" />

      <div className="relative flex whitespace-nowrap animate-ticker group-hover:[animation-play-state:paused]" style={{width:"fit-content"}}>
        {all.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 px-6 text-[11px] font-semibold text-white/90">
            <span className="drop-shadow-[0_0_6px_rgba(56,189,248,0.6)]">{item.icon}</span>
            <span className="text-white/50 tracking-wide">{item.label}:</span>
            <span className="text-sky-300 font-extrabold tabular-nums">{item.value}</span>
            <span className="w-1 h-1 rounded-full bg-sky-400/40 ml-4" />
          </span>
        ))}
      </div>
    </div>
  );
}
