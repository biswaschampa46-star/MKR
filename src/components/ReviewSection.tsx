"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquarePlus, Loader2, RefreshCw } from "lucide-react";
import StarRating from "@/components/StarRating";
import VerifiedPurchaseBadge from "@/components/VerifiedPurchaseBadge";
import ReviewModal from "@/components/ReviewModal";
import { formatDate } from "@/lib/format";
import { useGlobalLoading } from "@/lib/loading-store";
import type { RatingSummary } from "@/lib/reviews";
import type { ProductReview } from "@/db/schema";

type ReviewSectionProps = {
  productId: string;
  productName: string;
};

const PAGE_SIZE = 6;

export default function ReviewSection({ productId, productName }: ReviewSectionProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<RatingSummary | null>(null);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);

  const load = async (pageToLoad = 1, append = false) => {
    setLoading(true);
    setError(null);
    useGlobalLoading.getState().startTask();
    try {
      const res = await fetch(
        `/api/reviews?productId=${encodeURIComponent(productId)}&page=${pageToLoad}&limit=${PAGE_SIZE}`,
      );
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError("Reviews could not be loaded right now.");
        return;
      }
      setSummary(data.summary ?? null);
      setTotal(data.total ?? 0);
      setHasMore(Boolean(data.hasMore));
      setPage(pageToLoad);
      setReviews((prev) => (append ? [...prev, ...(data.reviews ?? [])] : (data.reviews ?? [])));
    } catch {
      setError("Reviews could not be loaded right now.");
    } finally {
      setLoading(false);
      setLoaded(true);
      useGlobalLoading.getState().endTask();
    }
  };

  // lazy-load once the section scrolls into view
  useEffect(() => {
    const el = rootRef.current;
    if (!el || loaded) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          void load(1, false);
        }
      },
      { threshold: 0.05, rootMargin: "0px 0px 12% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  // refresh when a new review is published
  useEffect(() => {
    const onPublished = () => void load(1, false);
    window.addEventListener("reviews:published", onPublished);
    return () => window.removeEventListener("reviews:published", onPublished);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  return (
    <section
      ref={rootRef}
      aria-label="Customer reviews"
      aria-busy={loading}
      className="mt-24 border-t border-line-soft pt-14 md:mt-32 md:pt-16"
    >
      <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
        <div>
          <p className="label">Customer Reviews</p>
          <h2 className="display-3 mt-5 text-foam">What people say</h2>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="btn btn-line"
        >
          <MessageSquarePlus className="h-4 w-4" strokeWidth={1.5} />
          Write a review
        </button>
      </div>
{/* summary */}
      {loaded && summary && summary.total > 0 && (
        <div className="mt-10 grid gap-8 md:grid-cols-12">
          <div className="md:col-span-4">
            <div className="flex items-end gap-3">
              <span className="font-display text-5xl font-extrabold text-foam">
                {summary.average.toFixed(1)}
              </span>
              <div className="pb-1.5">
                <StarRating value={summary.average} size={16} label="Average rating" />
                <p className="mt-1 text-xs text-mist/75">
                  {summary.total} {summary.total === 1 ? "review" : "reviews"}
                  {summary.verifiedCount > 0 && ` · ${summary.verifiedCount} verified`}
                </p>
              </div>
            </div>
          </div>

          <div className="md:col-span-8">
            <ul className="space-y-2.5">
              {[5, 4, 3, 2, 1].map((star) => {
                const n = summary.distribution[star] ?? 0;
                const pct = summary.total ? (n / summary.total) * 100 : 0;
                return (
                  <li key={star} className="flex items-center gap-3 text-xs text-mist/80">
                    <span className="w-3 text-right">{star}</span>
                    <StarRating value={star} size={11} />
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full bg-soft/70 transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-mist/60">{n}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {/* loading */}
      {loading && !loaded && (
        <div className="mt-10 space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-line-soft bg-white/[0.03]" />
          ))}
        </div>
      )}

      {/* error */}
      {error && (
        <div className="mt-10 rounded-xl border border-line-soft p-8 text-center">
          <p className="text-sm text-mist">{error}</p>
          <button
            type="button"
            onClick={() => void load(1, false)}
            className="btn btn-line mt-5"
          >
            <RefreshCw className="h-4 w-4" /> Try again
          </button>
        </div>
      )}

      {/* empty */}
      {loaded && !error && reviews.length === 0 && (
        <div className="mt-10 rounded-xl border border-line-soft p-10 text-center">
          <p className="font-display text-lg font-bold uppercase tracking-[0.1em] text-foam">
            No reviews yet
          </p>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-mist">
            Be the first to share your experience with {productName}.
          </p>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="btn btn-solid mt-7"
          >
            Write the first review
          </button>
        </div>
      )}

      {/* list */}
      {loaded && !error && reviews.length > 0 && (
        <ul className="mt-10 grid gap-4 md:grid-cols-2">
          {reviews.map((r) => (
            <li key={r.id} className="review-card flex flex-col rounded-xl border border-line-soft p-5">
              <div className="flex items-center justify-between gap-3">
                <StarRating value={r.rating} size={13} label={`${r.rating} out of 5`} />
                <span className="text-xs text-mist/60">{formatDate(r.createdAt)}</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                <span className="font-display text-sm font-semibold uppercase tracking-[0.08em] text-foam">
                  {r.name}
                </span>
                {r.verifiedPurchase && <VerifiedPurchaseBadge />}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-mist/90">{r.review}</p>
            </li>
          ))}
        </ul>
      )}

      {/* load more */}
      {hasMore && (
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => void load(page + 1, true)}
            disabled={loading}
            className="btn btn-line"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load more reviews"}
          </button>
        </div>
      )}

      {modalOpen && (
        <ReviewModal
          open={modalOpen}
          productId={productId}
          productName={productName}
          onClose={() => setModalOpen(false)}
        />
      )}
    </section>
  );
}