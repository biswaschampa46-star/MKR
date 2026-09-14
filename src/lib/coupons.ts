import { db } from "@/db";
import { coupons, couponRedemptions } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";

export type CouponRow = typeof coupons.$inferSelect;

export type CouponCheck =
  | { ok: true; coupon: CouponRow; discount: number }
  | { ok: false; message: string };

function normalize(code: string): string {
  return code.trim().toUpperCase().slice(0, 40);
}

/**
 * Server-side coupon validation. Every rule is enforced here — the frontend
 * never decides whether a coupon is valid or how much it is worth.
 */
export async function checkCoupon(rawCode: string, subtotal: number, phone?: string): Promise<CouponCheck> {
  const code = normalize(rawCode);
  if (!code) return { ok: false, message: "Enter a coupon code." };
  if (subtotal <= 0) return { ok: false, message: "Add items to your cart first." };

  let coupon: CouponRow | undefined;
  try {
    [coupon] = await db.select().from(coupons).where(eq(coupons.code, code)).limit(1);
  } catch {
    return { ok: false, message: "Something went wrong checking the coupon. Try again." };
  }
  if (!coupon) return { ok: false, message: "This coupon code is not valid." };
  if (!coupon.isActive) return { ok: false, message: "This coupon is currently inactive." };
  if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
    return { ok: false, message: "This coupon has expired." };
  }
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    return { ok: false, message: "This coupon has reached its usage limit." };
  }
  if (subtotal < coupon.minOrderAmount) {
    return { ok: false, message: `This coupon requires a minimum order of ৳${coupon.minOrderAmount}.` };
  }
  if (coupon.perUserLimit !== null && phone) {
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(couponRedemptions)
      .where(and(eq(couponRedemptions.couponId, coupon.id), eq(couponRedemptions.phone, phone)));
    if ((row?.n ?? 0) >= coupon.perUserLimit) {
      return { ok: false, message: "You have already used this coupon." };
    }
  }

  const discount =
    coupon.discountType === "percent"
      ? Math.min(
          Math.floor((subtotal * coupon.discountValue) / 100),
          coupon.maxDiscountAmount ?? Number.MAX_SAFE_INTEGER,
        )
      : Math.min(coupon.discountValue, subtotal);

  if (discount <= 0) return { ok: false, message: "This coupon does not apply to your order." };

  return { ok: true, coupon, discount: Math.min(discount, subtotal) };
}

/** Discount for a coupon that has already been validated (re-applied server-side). */
export function discountFor(coupon: CouponRow, subtotal: number): number {
  const discount =
    coupon.discountType === "percent"
      ? Math.min(
          Math.floor((subtotal * coupon.discountValue) / 100),
          coupon.maxDiscountAmount ?? Number.MAX_SAFE_INTEGER,
        )
      : Math.min(coupon.discountValue, subtotal);
  return Math.max(0, Math.min(discount, subtotal));
}

export function normalizeCode(rawCode: string): string {
  return normalize(rawCode);
}
