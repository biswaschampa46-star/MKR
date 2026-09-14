import { NextResponse } from "next/server";
import { checkCoupon } from "@/lib/coupons";

/** POST /api/coupons/validate — server-side coupon check. Never trusts the client. */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { code?: string; subtotal?: number; phone?: string };
    const code = (body.code ?? "").trim();
    const subtotal = Math.floor(Number(body.subtotal) || 0);
    const phone = (body.phone ?? "").trim() || undefined;

    // Subtotal is only used as a preview here; the authoritative check happens
    // again inside /api/checkout against server-computed values.
    if (subtotal <= 0) {
      return NextResponse.json({ ok: false, message: "Your cart is empty." }, { status: 400 });
    }

    const result = await checkCoupon(code, subtotal, phone);
    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      code: result.coupon.code,
      discount: result.discount,
      discountType: result.coupon.discountType,
      discountValue: result.coupon.discountValue,
    });
  } catch (err) {
    console.error("coupon validate failed", err);
    return NextResponse.json({ ok: false, message: "Could not check the coupon. Try again." }, { status: 500 });
  }
}
