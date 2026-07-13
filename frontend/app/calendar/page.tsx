"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns";
import { api } from "../../lib/api";
import { EventItem } from "../../lib/types";
import { useAuth } from "../../context/AuthContext";

export default function CalendarPage() {
  const { user } = useAuth();
  const [month, setMonth] = useState(new Date());
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  useEffect(() => {
    api
      .get("/events", {
        params: { startAfter: gridStart.toISOString(), startBefore: gridEnd.toISOString(), pageSize: 50 },
      })
      .then((res) => setEvents(res.data.events))
      .catch(() => setEvents([]));
  }, [gridStart.getTime(), gridEnd.getTime()]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, EventItem[]>();
    for (const e of events) {
      const key = format(new Date(e.startDate), "yyyy-MM-dd");
      map.set(key, [...(map.get(key) || []), e]);
    }
    return map;
  }, [events]);

  async function markInterested(eventId: string) {
    if (!user) return;
    setSavingId(eventId);
    try {
      await api.post(`/users/me/saved-events/${eventId}`);
      setSavedIds((prev) => new Set(prev).add(eventId));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="page-shell py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="display-heading text-3xl text-gray-900">Event calendar</h1>
        <div className="flex items-center gap-3">
          <button onClick={() => setMonth((m) => subMonths(m, 1))} className="btn-secondary px-3 py-1.5">←</button>
          <p className="min-w-[140px] text-center font-semibold">{format(month, "MMMM yyyy")}</p>
          <button onClick={() => setMonth((m) => addMonths(m, 1))} className="btn-secondary px-3 py-1.5">→</button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-900/50">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="py-2">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayEvents = eventsByDay.get(key) || [];
          return (
            <button
              key={key}
              onClick={() => setSelectedDay(day)}
              className={`min-h-[84px] rounded-lg border p-2 text-left align-top text-xs ${
                isSameMonth(day, month) ? "bg-white" : "bg-gray-50 text-gray-900/30"
              } ${selectedDay && isSameDay(selectedDay, day) ? "border-sunset-500" : "border-black/5"}`}
            >
              <p className="mb-1 font-semibold">{format(day, "d")}</p>
              {dayEvents.slice(0, 2).map((e) => (
                <p key={e.id} className="truncate rounded bg-sunset-100 px-1 py-0.5 text-[10px] text-sunset-700">
                  {e.title}
                </p>
              ))}
              {dayEvents.length > 2 && <p className="text-[10px] text-gray-900/40">+{dayEvents.length - 2} more</p>}
            </button>
          );
        })}
      </div>

      {selectedDay && (
        <div className="mt-6">
          <h2 className="mb-3 text-xl font-bold text-gray-900">{format(selectedDay, "EEEE, d MMMM")}</h2>
          {(eventsByDay.get(format(selectedDay, "yyyy-MM-dd")) || []).length === 0 ? (
            <p className="text-sm text-gray-900/50">No events on this day.</p>
          ) : (
            <div className="space-y-3">
              {(eventsByDay.get(format(selectedDay, "yyyy-MM-dd")) || []).map((e) => (
                <div key={e.id} className="card flex items-center justify-between p-4">
                  <div>
                    <Link href={`/events/${e.id}`} className="font-semibold hover:text-sunset-600">{e.title}</Link>
                    <p className="text-xs text-gray-900/50">{e.city}, {e.country}</p>
                  </div>
                  {user && (
                    <button
                      onClick={() => markInterested(e.id)}
                      disabled={savingId === e.id || savedIds.has(e.id)}
                      className="btn-secondary text-xs"
                    >
                      {savedIds.has(e.id) ? "Reminder set ✓" : savingId === e.id ? "Saving…" : "Remind me"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
