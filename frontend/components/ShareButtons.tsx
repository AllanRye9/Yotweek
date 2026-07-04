"use client";

export function ShareButtons({ title, url }: { title: string; url: string }) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const links = [
    { label: "WhatsApp", href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}` },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
    { label: "X", href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}` },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {links.map((l) => (
        <a
          key={l.label}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary !px-4 !py-1.5 text-xs"
        >
          Share on {l.label}
        </a>
      ))}
      <button
        onClick={() => {
          navigator.clipboard.writeText(url);
        }}
        className="btn-secondary !px-4 !py-1.5 text-xs"
      >
        Copy link
      </button>
    </div>
  );
}
