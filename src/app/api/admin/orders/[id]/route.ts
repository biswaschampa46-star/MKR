import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders, ORDER_STAGES } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isAdmin, unauthorized } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/orders/[id] — single order, admin-session guarded.
 * Used by the realtime toast to show what changed without pulling the
 * whole list (404 is expected for broadcasts about already-deleted rows).
 */
export async function GET(_request: Request, ctx: Ctx) {
  if (!(await isAdmin())) return unauthorized();
  const { id } = await ctx.params;
  try {
    const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!order) return NextResponse.json({ ok: false, message: "Order not found." }, { status: 404 });
    return NextResponse.json({ ok: true, order });
  } catch (err) {
    console.error("admin order fetch failed", err);
    return NextResponse.json({ ok: false, message: "Could not load the order." }, { status: 500 });
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  if (!(await isAdmin())) return unauthorized();
  const { id } = await ctx.params;
  try {
    const body = (await request.json()) as { status?: string; action?: string };
    const { action } = body;

    /* ——— verify the advance payment (server computes the amount, never the client) ——— */
    if (action === "verify_payment") {
      const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
      if (!order) return NextResponse.json({ ok: false, message: "Order not found." }, { status: 404 });
      const paid = order.paymentPurpose === "full_order" ? order.total : order.shippingFee;
      await db
        .update(orders)
        .set({
          amountPaid: paid,
          deliveryPaymentStatus: "paid",
          productPaymentStatus: order.paymentPurpose === "full_order" ? "paid" : "cod",
          status: "payment_verified",
          updatedAt: new Date(),
        })
        .where(eq(orders.id, id));
      return NextResponse.json({ ok: true });
    }

    /* ——— mark COD collected on delivery ——— */
    if (action === "collect_cod") {
      const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
      if (!order) return NextResponse.json({ ok: false, message: "Order not found." }, { status: 404 });
      await db
        .update(orders)
        .set({
          amountPaid: order.amountPaid + order.codAmount,
          codAmount: 0,
          productPaymentStatus: "paid",
          updatedAt: new Date(),
        })
        .where(eq(orders.id, id));
      return NextResponse.json({ ok: true });
    }

    const status = (body.status ?? "").trim();
    if (!(ORDER_STAGES as readonly string[]).includes(status) && status !== "cancelled") {
      return NextResponse.json({ ok: false, message: "Invalid status." }, { status: 400 });
    }
    await db
      .update(orders)
      .set({ status: status as (typeof ORDER_STAGES)[number] | "cancelled", updatedAt: new Date() })
      .where(eq(orders.id, id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin order update failed", err);
    return NextResponse.json({ ok: false, message: "Could not update the order." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  if (!(await isAdmin())) return unauthorized();
  const { id } = await ctx.params;
  try {
    await db.delete(orders).where(eq(orders.id, id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin order delete failed", err);
    return NextResponse.json({ ok: false, message: "Could not delete the order." }, { status: 500 });
  }
}
