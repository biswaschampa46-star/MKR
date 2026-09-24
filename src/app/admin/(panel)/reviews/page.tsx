import { Badge, SectionHeading } from "@/components/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import { moderateReviewAction, deleteReviewAction } from "@/app/actions/admin-community";
import { listReviewsForAdmin } from "@/lib/data/catalog";
import { formatDateTime } from "@/lib/admin-utils";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage({ searchParams }: { searchParams: Promise<{ status?: "pending" | "approved" | "rejected" }> }) {
  const params = await searchParams;
  const reviews = await listReviewsForAdmin(params.status);

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Moderation"
        title="Reviews"
        description="Only approved reviews are visible on the storefront. Rejecting with delete removes it permanently."
        action={
          <div className="flex gap-2">
            {[undefined, "pending", "approved", "rejected"].map((status) => (
              <a
                key={status ?? "all"}
                href={status ? `/admin/reviews?status=${status}` : "/admin/reviews"}
                className={`rounded-full border px-3 py-1.5 text-xs ${params.status === status ? "border-[#8ccbff] text-[#f4faff]" : "border-[#a8c0d5]/25 text-[#ddf3ff]"}`}
              >
                {status ?? "all"}
              </a>
            ))}
          </div>
        }
      />
      <div className="space-y-3">
        {reviews.length === 0 ? (
          <p className="glass rounded-3xl p-6 text-sm text-[#a8c0d5]">No reviews in this view.</p>
        ) : (
          reviews.map((review) => (
            <article key={review.id} className="glass space-y-3 rounded-3xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-display text-base text-[#f4faff]">{review.productName} · {review.rating}★</p>
                  <p className="text-xs text-[#a8c0d5]">{review.customerName ?? "customer"} · {review.customerEmail} · {formatDateTime(review.createdAt)}</p>
                </div>
                <Badge tone={review.status === "approved" ? "success" : review.status === "rejected" ? "danger" : "warn"}>{review.status}</Badge>
              </div>
              {review.title ? <p className="text-sm text-[#f4faff]">{review.title}</p> : null}
              <p className="text-sm text-[#a8c0d5]">{review.body}</p>
              <div className="flex flex-wrap gap-2">
                {(["approved", "pending", "rejected"] as const).map((status) => (
                  <form key={status} action={moderateReviewAction}>
                    <input type="hidden" name="reviewId" value={review.id} />
                    <input type="hidden" name="status" value={status} />
                    <SubmitButton key={status} pendingLabel="…" className="px-3 py-1.5 text-xs">{status}</SubmitButton>
                  </form>
                ))}
                <form action={deleteReviewAction}>
                  <input type="hidden" name="reviewId" value={review.id} />
                  <SubmitButton pendingLabel="Deleting…" variant="danger" className="px-3 py-1.5 text-xs">Delete</SubmitButton>
                </form>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
