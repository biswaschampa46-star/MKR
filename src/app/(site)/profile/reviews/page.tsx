import type { Metadata } from "next";
import Link from "next/link";
import { Badge, EmptyState, LinkButton, SectionHeading } from "@/components/ui";
import { deleteOwnReviewAction } from "@/app/actions/profile";
import { requireCustomer } from "@/lib/auth/customer";
import { listCustomerReviews } from "@/lib/data/catalog";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "My reviews", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function MyReviewsPage() {
  const customer = await requireCustomer("/profile/reviews");
  const reviews = await listCustomerReviews(customer.id);

  return (
    <div className="space-y-6">
      <SectionHeading eyebrow="Feedback" title="My reviews" description="Editing a review sends it back to moderation before it is published again." />
      {reviews.length === 0 ? (
        <EmptyState
          title="No reviews yet"
          description="Share your experience on a piece you have worn — it helps other customers size correctly."
          action={<LinkButton href="/profile/orders" size="sm" variant="outline">Review a purchase</LinkButton>}
        />
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <article key={review.id} className="glass space-y-2 rounded-3xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`/product/${review.productSlug}`} className="font-display text-base text-[#f4faff] hover:text-[#8ccbff]">
                  {review.productName}
                </Link>
                <div className="flex items-center gap-2">
                  <Badge tone={review.status === "approved" ? "success" : review.status === "rejected" ? "danger" : "warn"}>
                    {review.status}
                  </Badge>
                  <span className="text-xs text-[#8ccbff]">{review.rating}★</span>
                </div>
              </div>
              {review.title ? <p className="text-sm text-[#f4faff]">{review.title}</p> : null}
              <p className="text-sm text-[#a8c0d5]">{review.body}</p>
              <div className="flex items-center justify-between gap-3 pt-1">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#a8c0d5]/70">{formatDate(review.createdAt)}</p>
                <form action={deleteOwnReviewAction}>
                  <input type="hidden" name="id" value={review.id} />
                  <button type="submit" className="rounded-full border border-rose-400/40 px-3 py-1.5 text-xs text-rose-200 transition hover:bg-rose-500/10">
                    Delete
                  </button>
                </form>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
