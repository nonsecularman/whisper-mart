"use client";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { Spinner, StarRating } from "@/components/UI";

interface AdminReview {
  id: string;
  product_id: string;
  product_name: string;
  user_name: string;
  rating: number;
  comment?: string;
  is_approved: boolean;
  is_flagged: boolean;
  created_at: string;
}

export default function AdminReviewsPage() {
  const { showToast } = useToast();
  const [reviews, setReviews] = useState<AdminReview[] | null>(null);

  function load() {
    api.get<AdminReview[]>("/api/reviews/admin/all").then(setReviews).catch(() => setReviews([]));
  }
  useEffect(load, []);

  async function moderate(id: string, approved: boolean) {
    try {
      await api.put(`/api/reviews/admin/${id}/moderate?is_approved=${approved}`);
      showToast(approved ? "Review approved" : "Review hidden", "success");
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not update review", "error");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this review?")) return;
    try {
      await api.del(`/api/reviews/${id}`);
      showToast("Review deleted", "success");
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Could not delete review", "error");
    }
  }

  if (reviews === null) return <div className="py-16 flex justify-center"><Spinner size={28} /></div>;

  return (
    <div>
      <h1 className="text-xl font-display font-bold text-ink-900 mb-4">Reviews Moderation</h1>
      <div className="space-y-3">
        {reviews.map((r) => (
          <div key={r.id} className="bg-white rounded-xl2 shadow-card p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-sm text-ink-900">{r.product_name}</p>
                <p className="text-xs text-ink-500">by {r.user_name} · {new Date(r.created_at).toLocaleDateString()}</p>
              </div>
              <StarRating value={r.rating} />
            </div>
            {r.comment && <p className="text-sm text-ink-700 mt-2">{r.comment}</p>}
            <div className="flex gap-3 mt-3">
              {!r.is_approved ? (
                <button onClick={() => moderate(r.id, true)} className="text-xs font-semibold text-emerald-600">Approve</button>
              ) : (
                <button onClick={() => moderate(r.id, false)} className="text-xs font-semibold text-amber-600">Hide</button>
              )}
              <button onClick={() => remove(r.id)} className="text-xs font-semibold text-rose-600">Delete</button>
            </div>
          </div>
        ))}
        {reviews.length === 0 && <p className="text-sm text-ink-500">No reviews yet.</p>}
      </div>
    </div>
  );
}
