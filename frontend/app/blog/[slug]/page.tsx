"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { api } from "../../../lib/api";
import { Post } from "../../../lib/types";
import { recordSignal } from "../../../lib/preferences";
import { SafeImage } from "../../../components/SafeImage";

export default function PostPage() {
  const { slug } = useParams<{ slug:string }>();
  const router = useRouter();
  const [post, setPost] = useState<Post|null>(null);
  const readTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    api.get(`/posts/${slug}`).then(r => {
      setPost(r.data.post);
      const p = r.data.post;
      recordSignal({ postId:p.id, action:"view", tags:p.tags });
      readTimer.current = setTimeout(() => recordSignal({ postId:p.id, action:"read", tags:p.tags, durationMs:20000 }), 20000);
    }).catch(() => router.push("/blog"));
    return () => { if (readTimer.current) clearTimeout(readTimer.current); };
  }, [slug, router]);

  if (!post) return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-4 animate-pulse">
      <div className="h-8 shimmer bg-slate-100 rounded w-3/4" />
      <div className="aspect-video shimmer bg-slate-100 rounded-2xl" />
      {[...Array(6)].map((_,i) => <div key={i} className="h-4 shimmer bg-slate-100 rounded w-full" />)}
    </div>
  );

  return (
    <div className="animate-fade-in">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 sm:px-9 py-2.5 flex items-center gap-2 text-xs text-gray-400">
          <Link href="/" className="hover:text-sky-600">Home</Link><span>/</span>
          <Link href="/blog" className="hover:text-sky-600">Blog</Link><span>/</span>
          <span className="text-gray-700 font-medium truncate">{post.title}</span>
        </div>
      </div>
      <article className="max-w-3xl mx-auto px-6 sm:px-9 py-12">
        {post.coverImageUrl && (
          <div className="aspect-video overflow-hidden rounded-2xl mb-7 bg-slate-100">
            <SafeImage src={post.coverImageUrl} alt={post.title} className="w-full h-full object-cover"
              fallback={<div className="w-full h-full flex items-center justify-center text-4xl">✍️</div>} />
          </div>
        )}
        {post.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">{post.tags.map(t => <span key={t} className="badge bg-sky-50 text-sky-600">#{t}</span>)}</div>
        )}
        <h1 className="font-extrabold text-3xl sm:text-4xl text-gray-900 leading-tight mb-4">{post.title}</h1>
        <div className="flex items-center gap-3 mb-7 pb-7 border-b border-gray-100">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center text-white font-bold">{post.author.name[0]}</div>
          <div>
            <p className="text-sm font-semibold text-gray-800">{post.author.organizationName || post.author.name}</p>
            {post.publishedAt && <p className="text-xs text-gray-400">{format(new Date(post.publishedAt),"d MMMM yyyy")}</p>}
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-gray-400">
            <span>👁 {post.viewCount}</span>
          </div>
        </div>
        <div className="prose prose-gray max-w-none text-sm leading-relaxed text-gray-700 whitespace-pre-line">{post.body}</div>
        <div className="mt-10 pt-6 border-t border-gray-100">
          <Link href="/blog" className="btn-secondary !text-sm">← Back to blog</Link>
        </div>
      </article>
    </div>
  );
}
