"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "../lib/api";
import { EventVideo } from "../lib/types";
import { getYouTubeId, youTubeEmbedUrl } from "../lib/media";

// Compact video slideshow at the very top of the landing page. Clips are
// only ever submitted by admins or admin-approved (isVerifiedOrganizer)
// organizers, and only ever shown here once an admin has approved them
// (see /const/event-videos and POST /api/event-videos). Past and upcoming
// clips are mixed into one slideshow rather than split into tabs — this is
// a quick, glanceable strip, not a destination to browse through.
export function EventVideoSlider() {
  const [slides, setSlides] = useState<EventVideo[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/event-videos")
      .then(r => setSlides(r.data.videos || []))
      .catch(() => setSlides([]))
      .finally(() => setLoading(false));
  }, []);

  const next = useCallback(() => setIdx(i => (i + 1) % slides.length), [slides.length]);
  const prev = useCallback(() => setIdx(i => (i - 1 + slides.length) % slides.length), [slides.length]);

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(next, 6000);
    return () => clearInterval(t);
  }, [slides.length, next]);

  // Nothing to show and nothing loading — collapse entirely rather than
  // holding a blank slot open at the top of the homepage.
  if (!loading && slides.length === 0) return null;

  const cur = slides[idx];

  return (
    <div className="relative w-full overflow-hidden bg-slate-900" style={{ aspectRatio: "21/9", maxHeight: "220px" }}>
      {loading ? (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : cur && (
        <>
          {(() => {
            const ytId = getYouTubeId(cur.videoUrl);
            if (ytId) {
              return (
                <iframe
                  key={cur.id}
                  src={youTubeEmbedUrl(ytId)}
                  title={cur.title}
                  className="absolute inset-0 w-full h-full"
                  style={{ border: 0 }}
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              );
            }
            return (
              <>
                {/* Blurred, scaled copy fills the frame edge-to-edge as a backdrop */}
                <video
                  key={`${cur.id}-bg`}
                  src={cur.videoUrl}
                  autoPlay muted loop playsInline aria-hidden
                  className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-50"
                />
                {/* Real video, always shown in full — no cropping, no stretching */}
                <video
                  key={cur.id}
                  src={cur.videoUrl}
                  poster={cur.thumbnailUrl || undefined}
                  autoPlay muted loop playsInline
                  onError={() => { if (slides.length > 1) next(); }}
                  className="relative w-full h-full object-contain"
                />
              </>
            );
          })()}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 pointer-events-none">
            <h3 className="font-bold text-white text-xs sm:text-sm drop-shadow leading-snug line-clamp-1">{cur.title}</h3>
          </div>
          {slides.length > 1 && (
            <>
              <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors text-sm">‹</button>
              <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors text-sm">›</button>
              <div className="absolute bottom-2 right-3 flex gap-1.5">
                {slides.map((_, i) => (
                  <button key={i} onClick={() => setIdx(i)}
                    className={`h-1.5 rounded-full transition-all ${i === idx ? "bg-white w-4" : "bg-white/40 w-1.5"}`} />
                ))}
              </div>
            </>
          )}
          {cur.eventId && !getYouTubeId(cur.videoUrl) && (
            <Link href={`/events/${cur.eventId}`} className="absolute inset-0" aria-label={cur.title} />
          )}
        </>
      )}
    </div>
  );
}
