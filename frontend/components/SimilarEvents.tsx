"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../lib/api";
import { GalleryThumb } from "./GalleryThumb";

interface SimilarEvent {
  id: string;
  title: string;
  city?: string;
  country?: string;
  coverImageUrl?: string | null;
}

export function SimilarEvents({ eventId }: { eventId: string }) {
  const [events, setEvents] = useState<SimilarEvent[]>([]);

  useEffect(() => {
    api
      .get(`/recommendations/events/${eventId}/similar`)
      .then((res) => setEvents(res.data.events))
      .catch(() => setEvents([]));
  }, [eventId]);

  if (events.length === 0) return null;

  return (
    <div>
      <h3 className="mb-3 text-lg font-bold text-gray-900">You might also like</h3>
      <div className="grid gap-3 sm:grid-cols-3">
        {events.map((e) => (
          <Link key={e.id} href={`/events/${e.id}`} className="card overflow-hidden">
            <div className="h-24 w-full bg-gradient-to-br from-sunset-300 to-sunset-500">
              {e.coverImageUrl && (
                <GalleryThumb url={e.coverImageUrl} alt={e.title} className="h-full w-full object-cover" fallbackIcon="🎪" />
              )}
            </div>
            <div className="p-3">
              <p className="text-sm font-semibold line-clamp-1">{e.title}</p>
              {e.city && <p className="text-xs text-gray-900/50">{e.city}</p>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
