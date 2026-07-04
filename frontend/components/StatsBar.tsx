"use client";

import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { LandingStats } from "../lib/types";

const ITEMS: { key: keyof LandingStats; label: string; icon: string }[] = [
  { key: "totalVisitors", label: "Total visitors", icon: "👀" },
  { key: "dailyVisitors", label: "Visitors today", icon: "📅" },
  { key: "totalEventsHeld", label: "Events held", icon: "🎉" },
  { key: "activeEvents", label: "Active events", icon: "🟢" },
  { key: "totalRegisteredUsers", label: "Organizers & members", icon: "👥" },
];

export function StatsBar() {
  const [stats, setStats] = useState<LandingStats | null>(null);

  useEffect(() => {
    api.get("/stats/landing").then((res) => setStats(res.data)).catch(() => {});
  }, []);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {ITEMS.map((item) => (
        <div key={item.key} className="card flex flex-col items-center gap-1 px-3 py-4 text-center">
          <span className="text-xl">{item.icon}</span>
          <span className="font-display text-2xl font-bold text-savanna-900">
            {stats ? stats[item.key].toLocaleString() : "—"}
          </span>
          <span className="text-xs text-savanna-900/60">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
