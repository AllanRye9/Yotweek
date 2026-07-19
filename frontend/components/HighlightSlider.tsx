"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "../lib/api";
import { Highlight } from "../lib/types";
import { SafeImage } from "./SafeImage";

export function HighlightSlider() {
  const [slides, setSlides] = useState<Highlight[]>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    // The landing page's hero already has one video interface
    // (HeroVideoUnit). This banner stays image-only so it never becomes
    // a second video display further down the page — VIDEO-type highlights
    // still work anywhere else they might be surfaced, they just don't
    // render here.
    api.get("/highlights").then(r => setSlides((r.data.highlights || []).filter((h: Highlight) => h.mediaType !== "VIDEO"))).catch(() => {});
  }, []);

  const next = useCallback(() => setIdx(i => (i+1) % slides.length), [slides.length]);
  const prev = useCallback(() => setIdx(i => (i-1+slides.length) % slides.length), [slides.length]);

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(next, 6000);
    return () => clearInterval(t);
  }, [slides.length, next]);

  if (slides.length === 0) return null;
  const cur = slides[idx];

  const Media = (
    <div className="relative w-full overflow-hidden rounded-2xl bg-slate-800" style={{aspectRatio:"16/7"}}>
      {cur.mediaType === "VIDEO"
        ? <video key={cur.id} src={cur.mediaUrl} autoPlay muted loop playsInline className="w-full h-full object-cover" />
        : <SafeImage key={cur.id} src={cur.mediaUrl} alt={cur.title} className="w-full h-full object-cover animate-fade-in"
            fallback={<div className="w-full h-full bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-4xl">🖼️</div>} />}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <h3 className="font-extrabold text-white text-xl sm:text-2xl drop-shadow">{cur.title}</h3>
        {cur.subtitle && <p className="text-white/80 text-sm mt-1">{cur.subtitle}</p>}
      </div>
      {slides.length > 1 && (
        <>
          <button onClick={e => { e.preventDefault(); prev(); }} className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors">‹</button>
          <button onClick={e => { e.preventDefault(); next(); }} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors">›</button>
          <div className="absolute bottom-3 right-4 flex gap-1.5">
            {slides.map((_,i) => (
              <button key={i} onClick={e => { e.preventDefault(); setIdx(i); }}
                className={`w-2 h-2 rounded-full transition-all ${i===idx ? "bg-white w-5" : "bg-white/40"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
  return cur.linkUrl ? <Link href={cur.linkUrl}>{Media}</Link> : Media;
}
