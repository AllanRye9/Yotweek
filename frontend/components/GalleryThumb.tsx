"use client";
import { useState } from "react";
import { isVideoUrl } from "../lib/media";

// One gallery tile — photo, or (for video URLs) a still video-frame
// thumbnail with a play button, not an autoplaying/looping <video>. A strip
// of several autoplaying videos was heavy and, with no player chrome,
// looked broken rather than like a video. Clicking a video tile plays it
// in place with native controls. Both share the same broken-media
// fallback so a vanished/blocked file quietly shows a placeholder icon
// instead of a broken-image glyph.
export function GalleryThumb({ url, alt, className, fallbackIcon = "🖼️" }: { url: string; alt: string; className?: string; fallbackIcon?: string }) {
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const cls = className || "w-28 h-20 sm:w-32 sm:h-24 shrink-0 rounded-xl overflow-hidden ring-1 ring-gray-200";

  if (failed) {
    return (
      <div className={`${cls} bg-gray-100 flex items-center justify-center text-gray-300 text-xl shrink-0`}>
        {fallbackIcon}
      </div>
    );
  }

  if (!isVideoUrl(url)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={alt} className={`${cls} object-cover`} onError={() => setFailed(true)} loading="lazy" />;
  }

  function handleClick(e: React.SyntheticEvent<HTMLVideoElement>) {
    if (playing) return;
    e.preventDefault();
    setPlaying(true);
    const v = e.currentTarget;
    v.muted = false;
    v.play().catch(() => {});
  }

  return (
    <div className={`${cls} relative bg-slate-900 shrink-0`}>
      <video
        src={url + "#t=0.1"}
        className={`w-full h-full object-cover ${playing ? "" : "cursor-pointer"}`}
        muted
        playsInline
        preload="metadata"
        controls={playing}
        onClick={handleClick}
        onEnded={() => setPlaying(false)}
        onError={() => setFailed(true)}
      />
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-9 h-9 rounded-full bg-black/55 backdrop-blur-sm flex items-center justify-center text-white text-sm shadow-lg">▶</div>
        </div>
      )}
    </div>
  );
}
