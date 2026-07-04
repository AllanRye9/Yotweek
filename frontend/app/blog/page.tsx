"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../lib/api";
import { Post } from "../../lib/types";
import { useAuth } from "../../context/AuthContext";

export default function BlogListPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/posts").then((res) => setPosts(res.data.posts)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="container-page py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Traveler stories</h1>
          <p className="mt-1 text-sm text-savanna-900/60">
            Written by travelers, content creators, and event organizers on yotweek.
          </p>
        </div>
        {user && (
          <Link href="/blog/create" className="btn-primary">
            Write a story
          </Link>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-savanna-900/50">Loading…</p>
      ) : posts.length === 0 ? (
        <p className="text-sm text-savanna-900/50">No stories published yet — be the first to share one.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <Link key={p.id} href={`/blog/${p.slug}`} className="card overflow-hidden">
              <div className="h-40 w-full bg-gradient-to-br from-sunset-300 to-sunset-500">
                {p.coverImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.coverImageUrl} alt={p.title} className="h-full w-full object-cover" />
                )}
              </div>
              <div className="p-4">
                <h2 className="font-display text-lg font-bold line-clamp-2">{p.title}</h2>
                {p.excerpt && <p className="mt-1 text-sm text-savanna-900/60 line-clamp-2">{p.excerpt}</p>}
                <p className="mt-3 text-xs font-semibold text-savanna-900/50">
                  {p.author.organizationName || p.author.name}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
