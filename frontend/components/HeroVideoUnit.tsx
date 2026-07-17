"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { api } from "../lib/api";
import { EventVideo } from "../lib/types";
import { getYouTubeId, youTubeEmbedUrl } from "../lib/media";
import { LocationSelector } from "./LocationSelector";

const HEADLINE_WORDS = ["Discover", "what's", "happening", "around", "you", "—", "and", "the", "world"];

// One merged hero unit: the video/YouTube slideshow *is* the hero
// background, not a separate strip above it. Clips are only ever
// submitted by admins or admin-approved (isVerifiedOrganizer) organizers,
// and only ever shown here once an admin has approved them (see
// /const/event-videos and POST /api/event-videos). With no video content
// yet, this falls back to the brand gradient so the hero never looks
// broken or empty.
export function HeroVideoUnit() {
  const [slides, setSlides] = useState<EventVideo[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/event-videos")
      .then(r => setSlides(r.data.videos || []))
      .catch(() => setSlides([]))
      .finally(() => setLoading(false));
  }, []);

  const next = useCallback(() => setIdx(i => (i + 1) % Math.max(slides.length, 1)), [slides.length]);
  const prev = useCallback(() => setIdx(i => (i - 1 + slides.length) % slides.length), [slides.length]);

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(next, 7000);
    return () => clearInterval(t);
  }, [slides.length, next]);

  const cur = slides[idx];
  const hasVideo = !loading && !!cur;

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-sky-700 via-blue-700 to-indigo-800 min-h-[560px] sm:min-h-[640px] flex items-center">
      {/* Video/YouTube background — object-cover fills the hero edge-to-edge
          with no distortion (crops overflow rather than stretching, the
          correct behavior for a full-bleed background, unlike the earlier
          compact-widget version which used object-contain to show the
          whole frame in a small box). */}
      {hasVideo && (() => {
        const ytId = getYouTubeId(cur.videoUrl);
        return ytId ? (
          <iframe
            key={cur.id}
            src={youTubeEmbedUrl(ytId)}
            title={cur.title}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            style={{ border: 0 }}
            allow="autoplay; encrypted-media; picture-in-picture"
          />
        ) : (
          <video
            key={cur.id}
            src={cur.videoUrl}
            poster={cur.thumbnailUrl || undefined}
            autoPlay muted loop playsInline
            onError={() => { if (slides.length > 1) next(); }}
            className="absolute inset-0 w-full h-full object-cover"
          />
        );
      })()}

      {/* Scrim: kept deliberately light so the footage itself stays the
          star — just enough to keep white text legible, concentrated at
          the very top/bottom edges rather than washing out the whole
          frame. */}
      <div className={`absolute inset-0 ${hasVideo ? "bg-gradient-to-b from-black/35 via-black/10 to-black/45" : ""}`} />
      <div className={`absolute inset-0 ${hasVideo ? "bg-black/10" : ""}`} />
      <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-sunset-400/10 animate-float pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-sky-400/10 animate-float pointer-events-none" style={{ animationDelay: "2s" }} />

      {/* Text — reveals bit by bit on load/mount, not per-slide, so it
          doesn't re-animate distractingly every time the background clip
          rotates. */}
      <motion.div
        className="relative z-10 max-w-3xl mx-auto px-6 sm:px-9 py-16 text-center w-full"
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.28 } } }}
      >
        <motion.p
          variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
          transition={{ duration: 0.5 }}
          className="text-sky-200 text-xs font-bold uppercase tracking-widest mb-3"
        >
          Events · Businesses · Destinations
        </motion.p>

        <motion.h1
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.022 } } }}
          className="display-heading text-white text-4xl sm:text-5xl md:text-6xl leading-[1.1] mb-4 drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)]"
        >
          {HEADLINE_WORDS.map((word, wi) => (
            <span key={wi} className={`inline-block mr-[0.3em] ${wi >= 1 && wi <= 2 ? "display-accent" : ""}`}>
              {word.split("").map((ch, ci) => (
                <motion.span
                  key={ci}
                  variants={{ hidden: { opacity: 0, y: 12, filter: "blur(3px)" }, show: { opacity: 1, y: 0, filter: "blur(0px)" } }}
                  transition={{ duration: 0.25 }}
                  className="inline-block"
                >
                  {ch}
                </motion.span>
              ))}
            </span>
          ))}
        </motion.h1>

        <motion.p
          variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
          transition={{ duration: 0.5 }}
          className="text-white/80 text-sm sm:text-base max-w-xl mx-auto mb-6 leading-relaxed drop-shadow-[0_1px_6px_rgba(0,0,0,0.4)]"
        >
          Verified events, local businesses, and tourism destinations. Smart recommendations that learn from your interests — the more you explore, the better it gets.
        </motion.p>

        <motion.div
          variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
          transition={{ duration: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-4 mb-8"
        >
          <LocationSelector />
        </motion.div>

        <motion.div
          variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
          transition={{ duration: 0.5 }}
          className="flex flex-wrap justify-center gap-3"
        >
          <Link href="/events" className="btn-primary !px-7 !py-3 !text-base !rounded-xl shadow-glow-lg">Browse events</Link>
          <Link href="/businesses" className="btn-secondary !px-7 !py-3 !text-base !rounded-xl !bg-white/10 !border-white/30 !text-white hover:!bg-white/20">Find businesses</Link>
          <Link href="/search" className="btn-secondary !px-7 !py-3 !text-base !rounded-xl !bg-white/10 !border-white/30 !text-white hover:!bg-white/20">🔍 Search</Link>
        </motion.div>

        {hasVideo && cur.eventId && (
          <Link href={`/events/${cur.eventId}`}
            className="inline-flex items-center gap-1.5 mt-6 text-xs font-semibold text-white/80 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition-colors">
            ▶ Now playing: {cur.title}
          </Link>
        )}
      </motion.div>

      {/* Slide controls — edges and footer only, well clear of the
          centered text/button column above. */}
      {hasVideo && slides.length > 1 && (
        <>
          <button onClick={prev} aria-label="Previous clip"
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-colors text-sm backdrop-blur-sm">‹</button>
          <button onClick={next} aria-label="Next clip"
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-colors text-sm backdrop-blur-sm">›</button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
            {slides.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)} aria-label={`Clip ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${i === idx ? "bg-white w-4" : "bg-white/40 w-1.5"}`} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
