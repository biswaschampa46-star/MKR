import { NextResponse } from "next/server";
import {
  getReviewSummary,
  getApprovedReviews,
  createReview,
} from "@/lib/reviews";
import { verifyUserToken } from "@/lib/supabase-verify";

export const dynamic = "force-dynamic";

/**
 * GET /api/reviews?productId=…&page=1&limit=6
 * Returns the live rating summary plus a page of approved reviews.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(24, Math.max(1, parseInt(searchParams.get("limit") ?? "6", 10) || 6));

  if (!productId) {
    return NextResponse.json({ ok: false, message: "productId is required." }, { status: 400 });
  }

  const [summary, { reviews, total }] = await Promise.all([
    getReviewSummary(productId),
    getApprovedReviews(productId, { offset: (page - 1) * limit, limit }),
  ]);

  const hasMore = (page - 1) * limit + reviews.length < total;

  return NextResponse.json({
    ok: true,
    summary,
    reviews,
    total,
    page,
    hasMore,
  });
}

/** POST /api/reviews — create a review (validated server-side). */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }

  const payload = body as Parameters<typeof createReview>[0] & {
    /** Supabase access token of the signed-in customer (optional for guests). */
    accessToken?: string;
  };

  /* Link the review to the authenticated customer when possible.
     The token is verified server-side — a bare userId is never trusted. */
  let linkedUserId: string | null = null;
  if (payload.accessToken) {
    const verified = await verifyUserToken(payload.accessToken);
    if (verified.ok && verified.userId) linkedUserId = verified.userId;
  }

  const result = await createReview({ ...payload, userId: linkedUserId });
  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, review: result.review }, { status: 201 });
}