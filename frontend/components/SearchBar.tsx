"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "../lib/api";

interface SearchResults {
  events: { id: string; title: string; slug: string; city: string }[];
  businesses: { id: string; name: string; slug: string; city: string }[];
  posts: { id: string; title: string; slug: string }[];
}

export function SearchBar() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults(null);
      return;
    }
    const timer = setTimeout(() => {
      api
        .get("/search", { params: { q } })
        .then((res) => {
          setResults(res.data);
          setOpen(true);
        })
        .catch(() => setResults(null));
    }, 300); // debounce so we don't hammer the API on every keystroke
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const hasResults =
    results && (results.events.length > 0 || results.businesses.length > 0 || results.posts.length > 0);

  return (
    <div ref={containerRef} className="relative w-full max-w-xs">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results && setOpen(true)}
        placeholder="Search events, places, stories…"
        className="w-full rounded-full border border-savanna-900/15 bg-white px-4 py-2 text-sm outline-none focus:border-sunset-500"
      />
      {open && q.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-xl border border-black/5 bg-white p-2 shadow-xl">
          {!hasResults && <p className="px-3 py-2 text-sm text-savanna-900/50">No matches yet — try a different phrase.</p>}
          {results?.events.map((e) => (
            <Link key={e.id} href={`/events/${e.id}`} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-sunset-50">
              🎫 {e.title} <span className="text-savanna-900/40">· {e.city}</span>
            </Link>
          ))}
          {results?.businesses.map((b) => (
            <div key={b.id} className="block rounded-lg px-3 py-2 text-sm text-savanna-900/70">
              📍 {b.name} <span className="text-savanna-900/40">· {b.city}</span>
            </div>
          ))}
          {results?.posts.map((p) => (
            <Link key={p.id} href={`/blog/${p.slug}`} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-sunset-50">
              ✍️ {p.title}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
