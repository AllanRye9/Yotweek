"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { api } from "../../lib/api";
import { Post } from "../../lib/types";
import { SkeletonCard } from "../../components/SkeletonCard";
import { recordSignal } from "../../lib/preferences";

export default function BlogPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get("/posts", { params:{pageSize:24} }).then(r => setPosts(r.data.posts||[])).finally(() => setLoading(false)); }, []);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="max-w-7xl mx-auto">
          <h1 className="font-extrabold text-2xl sm:text-3xl mb-1">Travel Blog</h1>
          <p className="text-white/70 text-sm">Stories, guides, and inspiration from our community.</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 sm:px-9 py-12">
        {loading ? (
          <div className="listing-grid-3">{[...Array(6)].map((_,i) => <SkeletonCard key={i} />)}</div>
        ) : posts.length===0 ? (
          <div className="card-base p-12 text-center"><p className="text-4xl mb-3">✍️</p><p className="font-semibold text-gray-700">No posts yet</p></div>
        ) : (
          <div className="listing-grid-3 stagger">
            {posts.map(p => (
              <Link key={p.id} href={`/blog/${p.slug}`} onClick={() => recordSignal({ postId:p.id, action:"view", tags:p.tags })}
                className="card-base card-hover shine group overflow-hidden flex flex-col">
                <div className="aspect-[16/9] overflow-hidden bg-slate-100 relative">
                  {p.coverImageUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={p.coverImageUrl} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    : <div className="absolute inset-0 flex items-center justify-center text-4xl">✍️</div>}
                </div>
                <div className="p-4 flex flex-col flex-1">
                  {p.tags?.length > 0 && <div className="flex flex-wrap gap-1 mb-2">{p.tags.slice(0,2).map(t => <span key={t} className="badge bg-sky-50 text-sky-600">#{t}</span>)}</div>}
                  <h3 className="font-bold text-gray-900 text-sm line-clamp-2 mb-1.5 group-hover:text-sky-600 transition-colors flex-1">{p.title}</h3>
                  {p.excerpt && <p className="text-xs text-gray-400 line-clamp-2 mb-2">{p.excerpt}</p>}
                  <p className="text-[10px] text-gray-300 mt-auto">By {p.author.name}{p.publishedAt ? ` · ${format(new Date(p.publishedAt),"d MMM yyyy")}` : ""}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
