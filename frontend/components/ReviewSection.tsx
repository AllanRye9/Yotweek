"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { api } from "../lib/api";
import { Review } from "../lib/types";
import { useAuth } from "../context/AuthContext";

export function ReviewSection({ eventId }: { eventId: string }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    api.get(`/reviews/event/${eventId}`).then((res) => setReviews(res.data.reviews));
  }, [eventId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await api.post(`/reviews/event/${eventId}`, { rating, comment });
      setMessage(res.data.message);
      setComment("");
    } catch (err: any) {
      setMessage(err?.response?.data?.error || "Could not submit review");
    } finally {
      setSubmitting(false);
    }
  }

  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold">Ratings & reviews</h3>
        {avg && (
          <span className="text-sm font-semibold">
            ⭐ {avg.toFixed(1)} · {reviews.length} review{reviews.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      <div className="space-y-4">
        {reviews.length === 0 && <p className="text-sm text-savanna-900/50">No reviews yet — be the first to attend and share your experience.</p>}
        {reviews.map((r) => (
          <div key={r.id} className="border-b border-black/5 pb-3 last:border-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{r.user.name}</span>
              <span className="text-xs text-savanna-900/50">{format(new Date(r.createdAt), "d MMM yyyy")}</span>
            </div>
            <p className="text-sm text-sunset-600">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</p>
            {r.comment && <p className="mt-1 text-sm text-savanna-900/80">{r.comment}</p>}
          </div>
        ))}
      </div>

      {user ? (
        <form onSubmit={submit} className="mt-5 space-y-3 border-t border-black/5 pt-4">
          <label className="block text-sm font-medium">Your rating</label>
          <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="rounded-lg border border-savanna-900/15 px-3 py-2 text-sm">
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} star{n === 1 ? "" : "s"}
              </option>
            ))}
          </select>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience (optional)"
            className="w-full rounded-lg border border-savanna-900/15 px-3 py-2 text-sm"
            rows={3}
          />
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? "Submitting…" : "Submit review"}
          </button>
          {message && <p className="text-xs text-savanna-900/70">{message}</p>}
        </form>
      ) : (
        <p className="mt-4 text-sm text-savanna-900/50">Sign in to leave a review.</p>
      )}
    </div>
  );
}
