"use client";

import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Testimonial } from "../lib/types";
import { useAuth } from "../context/AuthContext";

export function TestimonialsSection() {
  const { user } = useAuth();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [content, setContent] = useState("");
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get("/testimonials").then((res) => setTestimonials(res.data.testimonials)).catch(() => setTestimonials([]));
  }, []);

  async function submit() {
    if (content.trim().length < 10) return;
    setSubmitting(true);
    try {
      const res = await api.post("/testimonials", { content });
      setSubmitMsg(res.data.message);
      setContent("");
    } catch (err: any) {
      setSubmitMsg(err?.response?.data?.error || "Could not submit your testimonial.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="bg-orange-50/50 py-14">
      <div className="container-page">
        <h2 className="mb-8 text-center font-display text-3xl font-bold">What travelers are saying</h2>

        {testimonials.length === 0 ? (
          <p className="text-center text-sm text-savanna-900/50">Be the first to share your experience.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t) => (
              <div key={t.id} className="card p-5">
                {t.rating && <p className="mb-2 text-sunset-500">{"★".repeat(t.rating)}{"☆".repeat(5 - t.rating)}</p>}
                <p className="text-sm text-savanna-900/80">&ldquo;{t.content}&rdquo;</p>
                <p className="mt-3 text-xs font-semibold text-savanna-900/60">
                  {t.user.name}{t.user.country ? ` · ${t.user.country}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}

        {user && (
          <div className="mx-auto mt-10 max-w-xl">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your experience with yotweek…"
              rows={3}
              className="w-full rounded-xl border border-savanna-900/15 px-4 py-3 text-sm"
            />
            <button onClick={submit} disabled={submitting} className="btn-primary mt-2">
              {submitting ? "Submitting…" : "Share your story"}
            </button>
            {submitMsg && <p className="mt-2 text-xs text-savanna-900/60">{submitMsg}</p>}
          </div>
        )}
      </div>
    </section>
  );
}
