"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Star, Trash2, Eye, EyeOff } from "lucide-react";
import { formatDate } from "@/lib/format";
import type { AdminReview } from "@/app/api/admin/reviews/route";
import UiSelect from "@/components/UiSelect";
import { useGlobalLoading } from "@/lib/loading-store";

export default function ReviewsManager({ reviews }: { reviews: AdminReview[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all"); // all | live | hidden
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      reviews.filter(
        (r) =>
          (filter === "all" ||
            (filter === "live" && r.approved) ||
            (filter === "hidden" && !r.approved)) &&
          (r.name.toLowerCase().includes(q.trim().toLowerCase()) ||
            r.review.toLowerCase().includes(q.trim().toLowerCase()) ||
            r.productName.toLowerCase().includes(q.trim().toLowerCase())),
      ),
    [reviews, q, filter],
  );

  const setApproved = async (id: string, approved: boolean) => {
    setBusyId(id);
    useGlobalLoading.getState().startTask();
    try {
      await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ approved }),
      });
      router.refresh();
    } finally {
      setBusyId(null);
      useGlobalLoading.getState().endTask();
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this review? This cannot be undone.")) return;
    setBusyId(id);
    useGlobalLoading.getState().startTask();
    try {
      await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusyId(null);
      useGlobalLoading.getState().endTask();
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search reviewer, review, product…"
          className="w-72 rounded-lg border border-line bg-transparent px-4 py-2.5 text-sm text-foam placeholder:text-mist/40 focus:border-soft/60 focus:outline-none"
        />
        <UiSelect
          variant="admin"
          value={filter}
          onChange={setFilter}
          options={useMemo(
            () => [
              { value: "all", label: "All reviews" },
              { value: "live", label: `Live (${reviews.filter((r) => r.approved).length})` },
              { value: "hidden", label: `Hidden (${reviews.filter((r) => !r.approved).length})` },
            ],
            [reviews],
          )}
          placeholder="All reviews"
          searchable={false}
          ariaLabel="Filter reviews"
          triggerClassName="ds-trigger--compact"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-mist">No reviews found.</p>
      ) : (
        <ul className="space-y-4">
          {filtered.map((r) => (
            <li key={r.id} className="rounded-xl border border-line-soft p-5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <div className="flex items-center gap-1" aria-label={`${r.rating} out of 5 stars`}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className="h-4 w-4"
                      stroke={n <= r.rating ? "#66b8ff" : "rgba(140,203,255,0.35)"}
                      fill={n <= r.rating ? "#66b8ff" : "rgba(140,203,255,0.12)"}
                      strokeWidth={1.4}
                      aria-hidden="true"
                    />
                  ))}
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[0.66rem] uppercase tracking-[0.12em] ${r.verifiedPurchase ? "text-soft" : "text-mist/70"}`}>
                  {r.verifiedPurchase ? "Verified" : "—"}
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-[0.66rem] uppercase tracking-[0.12em] ${r.approved ? "text-soft" : "text-accent/80"}`}>
                  {r.approved ? "Live" : "Hidden"}
                </span>
                <span className="ml-auto text-xs text-mist/60">{formatDate(r.createdAt)}</span>
              </div>

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <span className="font-display font-semibold uppercase tracking-[0.06em] text-foam">{r.name}</span>
                <span className="text-mist">on {r.productName}</span>
              </div>

              <p className="mt-2 text-sm leading-relaxed text-mist/90">{r.review}</p>

              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line-soft pt-3">
                <button
                  type="button"
                  onClick={() => setApproved(r.id, !r.approved)}
                  disabled={busyId === r.id}
                  className="rounded-lg border border-line px-3 py-1.5 text-xs text-soft hover:bg-white/5 disabled:opacity-50"
                >
                  {r.approved ? (
                    <>
                      <EyeOff className="h-3.5 w-3.5" /> Hide
                    </>
                  ) : (
                    <>
                      <Eye className="h-3.5 w-3.5" /> Restore
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => remove(r.id)}
                  disabled={busyId === r.id}
                  className="rounded-lg border border-accent/40 px-3 py-1.5 text-xs text-accent hover:bg-accent/10 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}