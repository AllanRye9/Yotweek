"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useIntlayer } from "next-intlayer";
import { api } from "../lib/api";
import { EventVideo } from "../lib/types";
import { getYouTubeId, youTubeEmbedUrl } from "../lib/media";
import { LocationSelector } from "./LocationSelector";

const MAX_SLIDE_SECONDS = 30;

// One merged hero unit: the video/YouTube slideshow *is* the hero
// background, not a separate strip above it. Clips are only ever
// submitted by admins or admin-approved (isVerifiedOrganizer) organizers,
// and only ever shown here once an admin has approved them (see
// /const/event-videos and POST /api/event-videos). With no video content
// yet, this falls back to the brand gradient so the hero never looks
// broken or empty.
//
// Slide-transition mechanics follow 3R-Elite's HeroSlideshow: the outgoing
// slide stays visible underneath the incoming one during the fade (no
// blackout gap), and auto-advance pauses while the browser tab is hidden.
export function HeroVideoUnit() {
  const content = useIntlayer("hero-video-unit");
  const [slides, setSlides] = useState<EventVideo[]>([]);
  const [idx, setIdx] = useState(0);
  const [prevIdx, setPrevIdx] = useState(-1);
  const [loading, setLoading] = useState(true);
  const isPausedRef = useRef(false);
  const capTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    api.get("/event-videos")
      .then(r => setSlides(r.data.videos || []))
      .catch(() => setSlides([]))
      .finally(() => setLoading(false));
  }, []);

  // Pause auto-advance while the tab is hidden, same as 3R-Elite — avoids
  // a clip silently burning through its cap (or finishing unseen) while
  // the user isn't even looking at the page.
  useEffect(() => {
    const onVisibility = () => { isPausedRef.current = document.hidden; };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const goTo = useCallback((target: number) => {
    setIdx(i => { setPrevIdx(i); return target; });
  }, []);
  const next = useCallback(() => {
    if (isPausedRef.current || slides.length < 2) return;
    setIdx(i => { setPrevIdx(i); return (i + 1) % slides.length; });
  }, [slides.length]);
  const prev = useCallback(() => {
    setIdx(i => { setPrevIdx(i); return (i - 1 + slides.length) % slides.length; });
  }, [slides.length]);

  // Every slide gets at most MAX_SLIDE_SECONDS, whether it's a short local
  // clip that ends naturally sooner (handled via onEnded on the <video>
  // below) or a YouTube embed / long clip that would otherwise keep
  // playing indefinitely.
  useEffect(() => {
    if (slides.length < 2) return;
    if (capTimerRef.current) clearTimeout(capTimerRef.current);
    capTimerRef.current = setTimeout(next, MAX_SLIDE_SECONDS * 1000);
    return () => { if (capTimerRef.current) clearTimeout(capTimerRef.current); };
  }, [idx, slides.length, next]);

  const cur = slides[idx];
  const hasVideo = !loading && !!cur;

  // Headline is translated as two whole phrases (word order/grammar isn't
  // consistent across languages), then split into words here at render
  // time — so the bit-by-bit reveal animation works correctly no matter
  // the active language's word count or script.
  const line1Words = String(content.headlineLine1).split(" ");
  const line2Words = String(content.headlineLine2).split(" ");

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-sky-700 via-blue-700 to-indigo-800 min-h-[360px] sm:min-h-[420px] flex items-center">
      {/* Slideshow layer: every slide is absolutely positioned and
          stacked. The active slide sits on top (z-2, opaque) and fades
          in; the previous slide stays fully opaque just beneath it
          (z-1) so there's never a blackout gap during the crossfade —
          non-active, non-previous slides are hidden entirely (z-0,
          opacity 0). Object-cover fills the hero edge-to-edge with no
          distortion (crops overflow rather than stretching). */}
      {hasVideo && slides.map((slide, i) => {
        const isActive = i === idx;
        const isPrev = i === prevIdx;
        if (!isActive && !isPrev) return null;
        const ytId = getYouTubeId(slide.videoUrl);

        return (
          <div
            key={slide.id}
            className="absolute inset-0"
            style={{
              zIndex: isActive ? 2 : 1,
              opacity: 1,
              transition: isActive ? "opacity 700ms ease-in-out" : undefined,
            }}
            aria-hidden={!isActive}
          >
            {isActive ? (
              ytId ? (
                <iframe
                  src={youTubeEmbedUrl(ytId)}
                  title={slide.title}
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                  style={{ border: 0 }}
                  allow="autoplay; encrypted-media; picture-in-picture"
                />
              ) : (
                <video
                  src={slide.videoUrl}
                  poster={slide.thumbnailUrl || undefined}
                  autoPlay muted loop={slides.length < 2} playsInline
                  onEnded={slides.length > 1 ? next : undefined}
                  onError={() => { if (slides.length > 1) next(); }}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )
            ) : slide.thumbnailUrl ? (
              // Outgoing slide: a frozen poster frame rather than a second
              // live video/iframe playing underneath — keeps the crossfade
              // gap-free without doubling up on playing media.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={slide.thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-slate-900" />
            )}
          </div>
        );
      })}

      {/* Scrim: kept deliberately light so the footage itself stays the
          star — just enough to keep white text legible, concentrated at
          the very top/bottom edges rather than washing out the whole
          frame. */}
      <div className={`absolute inset-0 z-[3] ${hasVideo ? "bg-gradient-to-b from-black/35 via-black/10 to-black/45" : ""}`} />
      <div className={`absolute inset-0 z-[3] ${hasVideo ? "bg-black/10" : ""}`} />
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
          {content.eyebrow}
        </motion.p>

        <motion.h1
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.022 } } }}
          className="display-heading text-white text-4xl sm:text-5xl md:text-6xl leading-[1.1] mb-4 drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)]"
        >
          {line1Words.map((word, wi) => (
            <span key={`l1-${wi}`} className="inline-block mr-[0.3em]">
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
          <br className="hidden sm:block" />
          {line2Words.map((word, wi) => (
            <span key={`l2-${wi}`} className="inline-block mr-[0.3em] display-accent">
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
          {content.tagline}
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
          <Link href="/events" className="btn-primary !px-7 !py-3 !text-base !rounded-xl shadow-glow-lg">{content.browseEvents}</Link>
          <Link href="/businesses" className="btn-secondary !px-7 !py-3 !text-base !rounded-xl !bg-white/10 !border-white/30 !text-white hover:!bg-white/20">{content.findBusinesses}</Link>
          <Link href="/search" className="btn-secondary !px-7 !py-3 !text-base !rounded-xl !bg-white/10 !border-white/30 !text-white hover:!bg-white/20">🔍 {content.search}</Link>
        </motion.div>

        {hasVideo && cur.eventId && (
          <Link href={`/events/${cur.eventId}`}
            className="inline-flex items-center gap-1.5 mt-6 text-xs font-semibold text-white/80 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition-colors">
            ▶ Now playing: {cur.title}
          </Link>
        )}
      </motion.div>

      {/* Slide controls — 3R-Elite's arrow + pill-indicator styling: soft
          black circular buttons that brighten to the brand accent color
          on hover, and pill indicators that widen for the active slide. */}
      {hasVideo && slides.length > 1 && (
        <>
          <button onClick={prev} aria-label="Previous clip"
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/30 hover:bg-sky-500/80 text-white flex items-center justify-center transition-colors backdrop-blur-sm">
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7"/></svg>
          </button>
          <button onClick={next} aria-label="Next clip"
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/30 hover:bg-sky-500/80 text-white flex items-center justify-center transition-colors backdrop-blur-sm">
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/></svg>
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
            {slides.map((_, i) => (
              <button key={i} onClick={() => goTo(i)} aria-label={`Go to clip ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === idx ? "w-6 bg-sky-400" : "w-1.5 bg-white/30 hover:bg-white/50"}`} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
