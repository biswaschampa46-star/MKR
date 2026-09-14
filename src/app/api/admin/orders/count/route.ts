import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { count, eq, inArray } from "drizzle-orm";
import { isAdmin, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Statuses the admin still has to act on (payment verification / fulfilment). */
const ACTION_NEEDED = ["pending_payment", "payment_verified", "confirmed", "processing"] as const;

/**
 * GET /api/admin/orders/count — pending-order badge count.
 * Admin-session guarded; called on load and whenever a realtime event arrives.
 */
export async function GET() {
  if (!(await isAdmin())) return unauthorized();
  try {
    const [row] = await db
      .select({ n: count() })
      .from(orders)
      .where(inArray(orders.status, [...ACTION_NEEDED]));
    const cancelled = await db
      .select({ n: count() })
      .from(orders)
      .where(eq(orders.status, "cancelled"));
    return NextResponse.json({
      ok: true,
      pending: row?.n ?? 0,
      cancelled: cancelled[0]?.n ?? 0,
    });
  } catch (err) {
    console.error("admin order count failed", err);
    return NextResponse.json({ ok: false, pending: 0, cancelled: 0 }, { status: 500 });
  }
}
