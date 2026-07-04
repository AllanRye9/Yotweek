"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../lib/api";
import { Highlight } from "../lib/types";

export function HighlightSlider() {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    api.get("/highlights").then((res) => setHighlights(res.data.highlights)).catch(() => setHighlights([]));
  }, []);

  useEffect(() => {
    if (highlights.length < 2) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % highlights.length), 6000);
    return () => clearInterval(timer);
  }, [highlights.length]);

  if (highlights.length === 0) return null;
  const current = highlights[index];

  const Media = (
    <div className="relative h-72 w-full overflow-hidden rounded-2xl bg-savanna-900 sm:h-96">
      {current.mediaType === "VIDEO" ? (
        <video key={current.id} src={current.mediaUrl} autoPlay muted loop playsInline className="h-full w-full object-cover" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={current.id} src={current.mediaUrl} alt={current.title} className="h-full w-full object-cover" />
      )}
      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 to-transparent p-6 text-white">
        <h3 className="font-display text-2xl font-bold">{current.title}</h3>
        {current.subtitle && <p className="mt-1 text-sm text-white/80">{current.subtitle}</p>}
      </div>

      {highlights.length > 1 && (
        <div className="absolute bottom-4 right-4 flex gap-1.5">
          {highlights.map((h, i) => (
            <button
              key={h.id}
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-2 w-2 rounded-full transition ${i === index ? "bg-white" : "bg-white/40"}`}
            />
          ))}
        </div>
      )}
    </div>
  );

  return current.linkUrl ? <Link href={current.linkUrl}>{Media}</Link> : Media;
}
