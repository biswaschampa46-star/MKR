"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, Trash2, Loader2, BadgeCheck } from "lucide-react";
import { useAuth } from "@/lib/auth-store";
import { fetchMyReviews, deleteMyReview, type CustomerReview } from "@/lib/customer";
import { formatDate } from "@/lib/format";
import {
  ProfileHeader, EmptyState, Skeleton, ErrorState, ConfirmDialog, Flash,
} from "@/components/profile/ProfileShell";

export default function ReviewsPage() {
  const user = useAuth((s) => s.user);
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CustomerReview | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      setReviews(await fetchMyReviews(user.id));
    } catch {
      setError("Could not load your reviews. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async () => {
    if (!user || !confirmDelete) return;
    setDeleting(true);
    const res = await deleteMyReview(user.id, confirmDelete.id);
    setDeleting(false);
    if (res.ok) {
      setReviews((prev) => prev.filter((r) => r.id !== confirmDelete.id));
      setMsg({ kind: "ok", text: "Review deleted." });
      setTimeout(() => setMsg(null), 2500);
    } else {
      setMsg({ kind: "error", text: res.message });
    }
    setConfirmDelete(null);
  };

  return (
    <div className="min-w-0">
      <ProfileHeader title="My Reviews" subtitle="Reviews you've written. You can delete a review at any time." />
      {msg && <Flash kind={msg.kind} text={msg.text} />}

      {loading ? (
        <div className="space-y-4"><Skeleton className="h-28 w-full" /><Skeleton className="h-28 w-full" /></div>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : reviews.length === 0 ? (
        <EmptyState
          icon={Star}
          title="No reviews yet"
          subtitle="After you receive an order, you can rate and review the products you bought."
          action={<Link href="/shop" className="btn btn-solid mt-2">Explore Shop</Link>}
        />
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="card-glass rounded-2xl p-6">
              <div className="flex items-center gap-4">
                <Link href={`/product/${r.product?.slug ?? ""}`} className="media-frame relative h-16 w-12 shrink-0 overflow-hidden">
                  <Image src={r.product?.image ?? ""} alt={r.product?.name ?? "Product"} fill sizes="48px" className="object-cover" />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/product/${r.product?.slug ?? ""}`} className="font-display truncate text-[0.85rem] font-semibold uppercase tracking-[0.05em] text-foam hover:text-ice">
                    {r.product?.name ?? "Product"}
                  </Link>
                  <p className="mt-1 text-[0.7rem] text-mist">{formatDate(r.created_at)}</p>
                  <div className="mt-1.5 flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} className={`h-3.5 w-3.5 ${n <= r.rating ? "fill-[#f7c948] text-[#f7c948]" : "text-mist/40"}`} strokeWidth={1.5} />
                    ))}
                    <span className="ml-1.5 text-[0.68rem] text-mist/70">({r.rating}/5)</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className={`rounded-full border px-2.5 py-0.5 text-[0.58rem] font-semibold uppercase tracking-[0.12em] ${
                    r.approved ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200" : "border-amber-300/30 bg-amber-300/10 text-amber-200"
                  }`}>
                    {r.approved ? "Approved" : "Pending"}
                  </span>
                  {r.verified_purchase && (
                    <span className="inline-flex items-center gap-1 text-[0.58rem] font-semibold uppercase tracking-[0.1em] text-soft">
                      <BadgeCheck className="h-3 w-3" /> Verified purchase
                    </span>
                  )}
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-mist/90">“{r.review}”</p>
              <div className="mt-4 flex justify-end border-t border-line-soft pt-3">
                <button type="button" onClick={() => setConfirmDelete(r)} className="btn !px-3.5 !py-2 text-[0.62rem] !border-[#ff9b8a]/30 !bg-[#ff9b8a]/10 !text-[#ffb3a6]">
                  <Trash2 className="h-3 w-3" /> Delete review
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete this review?"
        message="Your review will be removed from the product page permanently."
        confirmLabel="Delete"
        busy={deleting}
        onConfirm={remove}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}