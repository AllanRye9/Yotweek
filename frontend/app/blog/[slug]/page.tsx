"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { api } from "../../../lib/api";
import { Post } from "../../../lib/types";
import { ShareButtons } from "../../../components/ShareButtons";

export default function BlogDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api
      .get(`/posts/${slug}`)
      .then((res) => setPost(res.data.post))
      .catch(() => setNotFound(true));
  }, [slug]);

  if (notFound) return <div className="container-page py-10 text-sm text-savanna-900/50">Story not found.</div>;
  if (!post) return <div className="container-page py-10 text-sm text-savanna-900/50">Loading…</div>;

  return (
    <div className="container-page max-w-3xl py-10">
      {post.coverImageUrl && (
        <div className="mb-6 h-72 w-full overflow-hidden rounded-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.coverImageUrl} alt={post.title} className="h-full w-full object-cover" />
        </div>
      )}

      <h1 className="font-display text-3xl font-bold">{post.title}</h1>
      <p className="mt-2 text-sm text-savanna-900/60">
        By {post.author.organizationName || post.author.name}
        {post.publishedAt ? ` · ${format(new Date(post.publishedAt), "d MMMM yyyy")}` : ""}
      </p>

      <div className="mt-6 whitespace-pre-line text-savanna-900/85">{post.body}</div>

      {post.images.length > 0 && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {post.images.map((img, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={img} alt="" className="rounded-xl object-cover" />
          ))}
        </div>
      )}

      <div className="mt-8">
        <ShareButtons title={post.title} url={typeof window !== "undefined" ? window.location.href : ""} />
      </div>
    </div>
  );
}
