import { NextResponse } from "next/server";
import { db } from "@/db";
import { coupons } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isAdmin, unauthorized } from "@/lib/auth";
import { parseCoupon } from "../route";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH /api/admin/coupons/[id] — edit or enable/disable a coupon. */
export async function PATCH(request: Request, ctx: Ctx) {
  if (!(await isAdmin())) return unauthorized();
  const { id } = await ctx.params;
  try {
    const body = (await request.json()) as Record<string, unknown>;

    /* enable/disable shortcut */
    if (typeof body.isActive === "boolean" && Object.keys(body).length === 1) {
      await db.update(coupons).set({ isActive: body.isActive }).where(eq(coupons.id, id));
      return NextResponse.json({ ok: true });
    }

    const parsed = parseCoupon(body);
    if ("message" in parsed) return NextResponse.json({ ok: false, message: parsed.message }, { status: 400 });

    const [existing] = await db.select({ id: coupons.id, code: coupons.code }).from(coupons).where(eq(coupons.id, id)).limit(1);
    if (!existing) return NextResponse.json({ ok: false, message: "Coupon not found." }, { status: 404 });
    if (existing.code !== parsed.values.code) {
      const [dupe] = await db.select({ id: coupons.id }).from(coupons).where(eq(coupons.code, parsed.values.code)).limit(1);
      if (dupe) return NextResponse.json({ ok: false, message: "A coupon with this code already exists." }, { status: 400 });
    }

    await db.update(coupons).set(parsed.values).where(eq(coupons.id, id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin update coupon failed", err);
    return NextResponse.json({ ok: false, message: "Could not update the coupon." }, { status: 500 });
  }
}

/** DELETE /api/admin/coupons/[id] — delete a coupon. */
export async function DELETE(_request: Request, ctx: Ctx) {
  if (!(await isAdmin())) return unauthorized();
  const { id } = await ctx.params;
  try {
    await db.delete(coupons).where(eq(coupons.id, id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin delete coupon failed", err);
    return NextResponse.json({ ok: false, message: "Could not delete the coupon." }, { status: 500 });
  }
}
