"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";

export default function CreatePostPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [tags, setTags] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!user) {
    return (
      <div className="container-page py-10 text-sm text-savanna-900/60">
        Please sign in to write a story.
      </div>
    );
  }

  async function submit(status: "DRAFT" | "PUBLISHED") {
    setError(null);
    setSubmitting(true);
    try {
      const res = await api.post("/posts", {
        title,
        excerpt: excerpt || undefined,
        body,
        coverImageUrl: coverImageUrl || undefined,
        tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        status,
      });
      router.push(`/blog/${res.data.post.slug}`);
    } catch (err: any) {
      setError(err?.response?.data?.errors?.[0]?.msg || err?.response?.data?.error || "Could not save your story.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container-page max-w-2xl py-10">
      <h1 className="mb-6 font-display text-3xl font-bold">Write a travel story</h1>

      <div className="space-y-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="w-full rounded-xl border border-savanna-900/15 px-4 py-3"
        />
        <input
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder="Short excerpt (optional)"
          className="w-full rounded-xl border border-savanna-900/15 px-4 py-3"
        />
        <input
          value={coverImageUrl}
          onChange={(e) => setCoverImageUrl(e.target.value)}
          placeholder="Cover image URL (optional)"
          className="w-full rounded-xl border border-savanna-900/15 px-4 py-3"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Tell your story… (minimum 50 characters)"
          rows={10}
          className="w-full rounded-xl border border-savanna-900/15 px-4 py-3"
        />
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="Tags, comma separated (e.g. safari, uganda, budget-travel)"
          className="w-full rounded-xl border border-savanna-900/15 px-4 py-3"
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button onClick={() => submit("DRAFT")} disabled={submitting} className="btn-secondary">
            Save as draft
          </button>
          <button onClick={() => submit("PUBLISHED")} disabled={submitting} className="btn-primary">
            {submitting ? "Publishing…" : "Publish"}
          </button>
        </div>
      </div>
    </div>
  );
}
