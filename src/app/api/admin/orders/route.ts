import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { desc } from "drizzle-orm";
import { isAdmin, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/orders — full order list for live-updating admin views.
 * Admin-session guarded; safe to re-fetch whenever a realtime event arrives.
 */
export async function GET() {
  if (!(await isAdmin())) return unauthorized();
  try {
    const list = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        customerName: orders.customerName,
        phone: orders.phone,
        email: orders.email,
        address: orders.address,
        city: orders.city,
        notes: orders.notes,
        paymentMethod: orders.paymentMethod,
        senderNumber: orders.senderNumber,
        transactionId: orders.transactionId,
        subtotal: orders.subtotal,
        shippingFee: orders.shippingFee,
        total: orders.total,
        discount: orders.discount,
        couponCode: orders.couponCode,
        deliveryZone: orders.deliveryZone,
        paymentPurpose: orders.paymentPurpose,
        amountPaid: orders.amountPaid,
        codAmount: orders.codAmount,
        deliveryPaymentStatus: orders.deliveryPaymentStatus,
        productPaymentStatus: orders.productPaymentStatus,
        clientRequestId: orders.clientRequestId,
        items: orders.items,
        status: orders.status,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        userId: orders.userId,
      })
      .from(orders)
      .orderBy(desc(orders.createdAt));
    return NextResponse.json({ ok: true, orders: list });
  } catch (err) {
    console.error("admin orders list failed", err);
    return NextResponse.json({ ok: false, message: "Could not load orders." }, { status: 500 });
  }
}
