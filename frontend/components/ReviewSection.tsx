"use client";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { api } from "../lib/api";
import { Review } from "../lib/types";
import { useAuth } from "../context/AuthContext";
import { useToast } from "./Toast";
import { recordSignal } from "../lib/preferences";

function Stars({ n, interactive, onSet }: { n:number; interactive?:boolean; onSet?:(n:number)=>void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <button key={i} type="button" onClick={() => onSet?.(i)}
          onMouseEnter={() => interactive && setHover(i)}
          onMouseLeave={() => interactive && setHover(0)}
          className={`text-xl transition-colors ${interactive?"cursor-pointer":"cursor-default"} ${i<=(hover||n)?"text-amber-400":"text-gray-200"}`}>
          ★
        </button>
      ))}
    </div>
  );
}

export function ReviewSection({ eventId }: { eventId:string }) {
  const { user } = useAuth();
  const toast = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get(`/reviews/event/${eventId}`).then(r => setReviews(r.data.reviews)).catch(() => {});
  }, [eventId]);

  const avg = reviews.length ? reviews.reduce((s,r) => s+r.rating,0)/reviews.length : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) { toast.error("Sign in to leave a review."); return; }
    setSubmitting(true);
    try {
      await api.post(`/reviews/event/${eventId}`, { rating, comment });
      toast.success("Review submitted! It'll appear after moderation.");
      setComment("");
      recordSignal({ eventId, action:"like" });
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Could not submit review.");
    } finally { setSubmitting(false); }
  }

  return (
    <div className="card-base p-5 sm:p-7">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-extrabold text-lg text-gray-900">Ratings & Reviews</h3>
        {avg && (
          <div className="flex items-center gap-2">
            <Stars n={Math.round(avg)} />
            <span className="text-sm font-bold text-gray-700">{avg.toFixed(1)}</span>
            <span className="text-xs text-gray-400">({reviews.length})</span>
          </div>
        )}
      </div>
      <div className="space-y-4 mb-6">
        {reviews.length === 0
          ? <p className="text-sm text-gray-400 text-center py-4">No reviews yet. Be the first!</p>
          : reviews.map(r => (
            <div key={r.id} className="border-b border-gray-100 pb-4 last:border-0">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">{r.user.name[0]}</div>
                  <span className="text-sm font-semibold text-gray-800">{r.user.name}</span>
                </div>
                <span className="text-xs text-gray-400">{format(new Date(r.createdAt), "d MMM yyyy")}</span>
              </div>
              <Stars n={r.rating} />
              {r.comment && <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">{r.comment}</p>}
            </div>
          ))}
      </div>
      <div className="border-t border-gray-100 pt-5">
        <h4 className="font-bold text-gray-900 text-sm mb-3">Leave a review</h4>
        {user ? (
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Your rating</label>
              <Stars n={rating} interactive onSet={setRating} />
            </div>
            <textarea value={comment} onChange={e => setComment(e.target.value)}
              placeholder="Share your experience…" rows={3} className="input-base !text-sm" />
            <button type="submit" disabled={submitting} className="btn-primary !px-5 !py-2 !text-sm">
              {submitting ? "Submitting…" : "Submit review"}
            </button>
          </form>
        ) : (
          <p className="text-sm text-gray-400"><a href="/auth/login" className="text-sky-600 font-semibold underline">Sign in</a> to leave a review.</p>
        )}
      </div>
    </div>
  );
}
