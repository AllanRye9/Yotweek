// Listing galleries (events/businesses) store cover + gallery items as
// plain URL strings with no separate "type" column, so we tell photos and
// videos apart by file extension.
export function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov)(\?.*)?$/i.test(url);
}

// Recognizes youtube.com/watch?v=, youtu.be/, youtube.com/shorts/, and
// youtube.com/embed/ links, returning the 11-char video id, or null if the
// URL isn't a YouTube link at all.
export function getYouTubeId(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return m ? m[1] : null;
}

// Privacy-enhanced embed URL for a YouTube id, configured for the
// autoplay/muted/looping "slideshow clip" behavior used across the site.
export function youTubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&modestbranding=1&playsinline=1&rel=0`;
}
