import { NextResponse } from "next/server";
import { db } from "@/db";
import { coupons } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { isAdmin, unauthorized } from "@/lib/auth";

/** GET /api/admin/coupons — list all coupons. */
export async function GET() {
  if (!(await isAdmin())) return unauthorized();
  try {
    const list = await db.select().from(coupons).orderBy(desc(coupons.createdAt));
    return NextResponse.json({ ok: true, coupons: list });
  } catch (err) {
    console.error("admin list coupons failed", err);
    return NextResponse.json({ ok: false, message: "Could not load coupons." }, { status: 500 });
  }
}

/** POST /api/admin/coupons — create a coupon. */
export async function POST(request: Request) {
  if (!(await isAdmin())) return unauthorized();
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const parsed = parseCoupon(body);
    if ("message" in parsed) return NextResponse.json({ ok: false, message: parsed.message }, { status: 400 });

    const code = parsed.values.code;
    const [existing] = await db.select({ id: coupons.id }).from(coupons).where(eq(coupons.code, code)).limit(1);
    if (existing) return NextResponse.json({ ok: false, message: "A coupon with this code already exists." }, { status: 400 });

    const [created] = await db.insert(coupons).values(parsed.values).returning();
    return NextResponse.json({ ok: true, coupon: created });
  } catch (err) {
    console.error("admin create coupon failed", err);
    return NextResponse.json({ ok: false, message: "Could not create the coupon." }, { status: 500 });
  }
}

export type CouponInput = {
  code: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount: number | null;
  expiresAt: Date | null;
  isActive: boolean;
  usageLimit: number | null;
  perUserLimit: number | null;
};

/** Shared validation for create/update. Returns { values } or { message }. */
export function parseCoupon(body: Record<string, unknown>): { values: CouponInput } | { message: string } {
  const code = String(body.code ?? "").trim().toUpperCase().slice(0, 40);
  if (!/^[A-Z0-9_-]{3,}$/.test(code)) {
    return { message: "Code must be at least 3 characters (letters, numbers, - or _)." };
  }
  const discountType = body.discountType === "fixed" ? "fixed" : "percent";
  const discountValue = Math.floor(Number(body.discountValue));
  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    return { message: "Discount value must be a positive number." };
  }
  if (discountType === "percent" && discountValue > 100) {
    return { message: "Percent discount cannot exceed 100." };
  }
  const minOrderAmount = Math.max(0, Math.floor(Number(body.minOrderAmount) || 0));
  const maxRaw = Math.floor(Number(body.maxDiscountAmount) || 0);
  const maxDiscountAmount = maxRaw > 0 ? maxRaw : null;
  const expRaw = String(body.expiresAt ?? "").trim();
  let expiresAt: Date | null = null;
  if (expRaw) {
    const d = new Date(expRaw);
    if (Number.isNaN(d.getTime())) return { message: "Invalid expiry date." };
    expiresAt = d;
  }
  const limitRaw = Math.floor(Number(body.usageLimit) || 0);
  const usageLimit = limitRaw > 0 ? limitRaw : null;
  const perUserRaw = Math.floor(Number(body.perUserLimit) || 0);
  const perUserLimit = perUserRaw > 0 ? perUserRaw : null;

  return {
    values: {
      code,
      discountType,
      discountValue,
      minOrderAmount,
      maxDiscountAmount,
      expiresAt,
      isActive: body.isActive !== false,
      usageLimit,
      perUserLimit,
    },
  };
}
