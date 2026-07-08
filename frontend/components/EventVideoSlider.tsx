"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "../lib/api";
import { EventVideo, EventVideoTiming } from "../lib/types";

// Video slider shown on the homepage hero, left of the headline. Lets
// visitors flip between clips from past events and previews of upcoming
// ones. Clips are only ever submitted by admins or admin-approved
// (isVerifiedOrganizer) organizers, and only ever shown here once an admin
// has approved them (see /const/event-videos and POST /api/event-videos).
export function EventVideoSlider() {
  const [timing, setTiming] = useState<EventVideoTiming>("UPCOMING");
  const [slides, setSlides] = useState<EventVideo[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get("/event-videos", { params: { timing } })
      .then(r => { setSlides(r.data.videos || []); setIdx(0); })
      .catch(() => setSlides([]))
      .finally(() => setLoading(false));
  }, [timing]);

  const next = useCallback(() => setIdx(i => (i + 1) % slides.length), [slides.length]);
  const prev = useCallback(() => setIdx(i => (i - 1 + slides.length) % slides.length), [slides.length]);

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(next, 6000);
    return () => clearInterval(t);
  }, [slides.length, next]);

  const cur = slides[idx];

  return (
    <div>
      <div className="flex gap-2 mb-3">
        {(["UPCOMING", "PAST"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTiming(t)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              timing === t ? "bg-white text-sky-700" : "bg-white/10 text-white/70 hover:bg-white/20"
            }`}
          >
            {t === "UPCOMING" ? "🎬 Upcoming events" : "📼 Past events"}
          </button>
        ))}
      </div>

      <div className="relative w-full overflow-hidden rounded-2xl bg-slate-800" style={{ aspectRatio: "9/12" }}>
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !cur ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-center px-6 gap-2">
            <span className="text-2xl">🎞️</span>
            <p className="text-white/60 text-xs">
              {timing === "UPCOMING" ? "No upcoming event clips yet." : "No past event clips yet."}
            </p>
          </div>
        ) : (
          <>
            <video
              key={cur.id}
              src={cur.videoUrl}
              poster={cur.thumbnailUrl || undefined}
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <h3 className="font-extrabold text-white text-base drop-shadow leading-snug">{cur.title}</h3>
              {cur.caption && <p className="text-white/80 text-xs mt-1 line-clamp-2">{cur.caption}</p>}
            </div>
            {slides.length > 1 && (
              <>
                <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors">‹</button>
                <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors">›</button>
                <div className="absolute bottom-2 right-3 flex gap-1.5">
                  {slides.map((_, i) => (
                    <button key={i} onClick={() => setIdx(i)}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${i === idx ? "bg-white w-4" : "bg-white/40"}`} />
                  ))}
                </div>
              </>
            )}
            {cur.eventId && (
              <Link href={`/events/${cur.eventId}`} className="absolute inset-0" aria-label={cur.title} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
