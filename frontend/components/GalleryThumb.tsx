"use client";
import { useState } from "react";
import { isVideoUrl } from "../lib/media";

// One gallery tile — photo or looping video, both sharing the same
// broken-media fallback so a vanished/blocked file quietly shows a
// placeholder icon instead of a broken-image glyph.
export function GalleryThumb({ url, alt, className, fallbackIcon = "🖼️" }: { url: string; alt: string; className?: string; fallbackIcon?: string }) {
  const [failed, setFailed] = useState(false);
  const cls = className || "w-28 h-20 sm:w-32 sm:h-24 shrink-0 rounded-xl object-cover ring-1 ring-gray-200";

  if (failed) {
    return (
      <div className={`${cls} bg-gray-100 flex items-center justify-center text-gray-300 text-xl shrink-0`}>
        {fallbackIcon}
      </div>
    );
  }

  return isVideoUrl(url) ? (
    <video src={url} muted autoPlay loop playsInline className={cls} onError={() => setFailed(true)} />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={alt} className={cls} onError={() => setFailed(true)} />
  );
}
