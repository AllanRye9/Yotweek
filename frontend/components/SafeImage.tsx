"use client";
import { useState, useEffect } from "react";

// Wraps an <img> with graceful degradation: no src, or a src that fails to
// load (vanished upload, blocked host, bad URL), quietly renders the given
// fallback instead of the browser's broken-image glyph.
export function SafeImage({
  src, alt, className, fallback, loading = "lazy",
}: {
  src?: string | null;
  alt: string;
  className?: string;
  fallback: React.ReactNode;
  loading?: "lazy" | "eager";
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  if (!src || failed) return <>{fallback}</>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} loading={loading} onError={() => setFailed(true)} />
  );
}
