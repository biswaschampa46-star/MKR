import { and, count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  productReviews,
  products,
  orders,
  type ProductReview,
} from "@/db/schema";

export type RatingSummary = {
  average: number;
  total: number;
  verifiedCount: number;
  distribution: Record<number, number>; // key = star (1–5) → count
};

/* ------------------------------------------------------------------ */
/*  Aggregates                                                         */
/* ------------------------------------------------------------------ */

/**
 * Averaged, live rating for a product — never stitched/faked. Returns
 * `null` when there are no approved reviews yet.
 */
export async function getReviewSummary(
  productId: string,
): Promise<RatingSummary | null> {
  try {
    const where = and(
      eq(productReviews.productId, productId),
      eq(productReviews.approved, true),
    );
    // Server-side aggregation: one small grouped query instead of loading every row.
    const [totals, distRows] = await Promise.all([
      db
        .select({
          total: count(),
          average: sql<number | null>`avg(${productReviews.rating})`,
          verifiedCount: sql<number>`count(*) filter (where ${productReviews.verifiedPurchase})`,
        })
        .from(productReviews)
        .where(where),
      db
        .select({ rating: productReviews.rating, n: count() })
        .from(productReviews)
        .where(where)
        .groupBy(productReviews.rating),
    ]);

    const total = totals[0]?.total ?? 0;
    if (total === 0) return null;

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const row of distRows) {
      distribution[row.rating] = row.n;
    }

    return {
      average: Number(totals[0]?.average ?? 0),
      total,
      verifiedCount: totals[0]?.verifiedCount ?? 0,
      distribution,
    };
  } catch {
    return null;
  }
}

export type ReviewsPage = {
  reviews: ProductReview[];
  total: number;
};

export async function getApprovedReviews(
  productId: string,
  { offset = 0, limit = 6 }: { offset?: number; limit?: number } = {},
): Promise<ReviewsPage> {
  try {
    const where = and(
      eq(productReviews.productId, productId),
      eq(productReviews.approved, true),
    );
    const [reviews, totalRows] = await Promise.all([
      db
        .select()
        .from(productReviews)
        .where(where)
        .orderBy(desc(productReviews.createdAt))
        .offset(offset)
        .limit(limit),
      db.select({ n: count() }).from(productReviews).where(where),
    ]);
    return { reviews, total: totalRows[0]?.n ?? reviews.length };
  } catch {
    return { reviews: [], total: 0 };
  }
}

/* ------------------------------------------------------------------ */
/* Create                                                              */
/* ------------------------------------------------------------------ */

export type CreateReviewInput = {
  productId?: string;
  name?: string;
  rating?: number;
  review?: string;
  email?: string;
  phone?: string;
  /** Verified Supabase user id (already token-checked by the route). Null for guests. */
  userId?: string | null;
};

export async function createReview(input: CreateReviewInput): Promise<{
  ok: true;
  review: ProductReview;
} | {
  ok: false;
  message: string;
}> {
  const productId = String(input.productId ?? "").trim();
  const name = String(input.name ?? "").trim().replace(/\s+/g, " ").slice(0, 120);
  const review = String(input.review ?? "").trim().replace(/\s+/g, " ").slice(0, 1500);
  const rating = Math.round(Number(input.rating));
  const email = String(input.email ?? "").trim().slice(0, 160) || null;
  const phone =
    String(input.phone ?? "")
      .trim()
      .replace(/[^0-9+\-]/g, "") || null;

  // ——— validation ———
  if (!productId) return { ok: false, message: "Product is required." };
  if (!name) return { ok: false, message: "Please add your name." };
  if (name.length < 2) return { ok: false, message: "Your name looks a little short." };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5)
    return { ok: false, message: "Please choose a rating between 1 and 5 stars." };
  if (review.length < 6)
    return { ok: false, message: "Please share a few words about your experience." };
  if (review.length > 1500)
    return { ok: false, message: "Please keep your review under 1,500 characters." };

  try {
    // ensure the product still exists (FK guard)
    const [existing] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);
    if (!existing) return { ok: false, message: "That product could not be found." };

    // verified purchase — match the buyer against an order that actually
    // contains this product. Prefer the authenticated user id; fall back to
    // the legacy phone match for guest reviews. Never assumed.
    let verifiedPurchase = false;
    if (input.userId) {
      const orderRows = await db
        .select({ items: orders.items })
        .from(orders)
        .where(eq(orders.userId, input.userId));
      verifiedPurchase = orderRows.some((order) =>
        order.items.some((item) => item.productId === productId),
      );
    }
    if (!verifiedPurchase && phone) {
      const orderRows = await db
        .select({ items: orders.items })
        .from(orders)
        .where(eq(orders.phone, phone));
      verifiedPurchase = orderRows.some((order) =>
        order.items.some((item) => item.productId === productId),
      );
    }

    const [created] = await db
      .insert(productReviews)
      .values({
        productId,
        userId: input.userId ?? null,
        name,
        rating,
        review,
        email,
        phone,
        verifiedPurchase,
        approved: true,
      })
      .returning();

    return { ok: true, review: created };
  } catch (err) {
    console.error("create review failed", err);
    return { ok: false, message: "Could not save your review. Please try again." };
  }
}