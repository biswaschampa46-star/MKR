"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db/client";
import { orders } from "@/db/schema";
import { getCurrentCustomer, sha256 } from "@/lib/auth/customer";
import { ORDER_ACCESS_COOKIE_PREFIX } from "@/lib/orders/access";
import { updateOrderStatus } from "@/lib/data/commerce";
import type { ActionResult } from "@/types";

/** Cancellation is allowed only BEFORE fulfilment starts (matches the
    live update_order_status lifecycle, which restocks on cancel/return). */
const CANCELLABLE_STATUSES = new Set(["pending", "confirmed"]);

export async function cancelOrderAction(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const orderId = String(formData.get("orderId") ?? "");
  const confirm = String(formData.get("confirm") ?? "").trim().toUpperCase();
  if (!orderId) return { ok: false, error: "Missing order." };
  if (confirm !== "CANCEL") {
    return { ok: false, error: "Type CANCEL to confirm this cancellation." };
  }

  // ── Authorization (server-side, both paths verified) ──
  const rows = await db
    .select({ customerId: orders.customerId, accessTokenHash: orders.accessTokenHash, status: orders.status })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  const order = rows[0];
  if (!order) return { ok: false, error: "Order not found." };

  let authorized = false;
  const customer = await getCurrentCustomer();
  if (customer && order.customerId && order.customerId === customer.id) {
    authorized = true;
  } else if (!order.customerId) {
    // Guest order: only the browser holding the checkout-issued token may cancel.
    const store = await cookies();
    const token = store.get(`${ORDER_ACCESS_COOKIE_PREFIX}${orderId}`)?.value;
    if (token && order.accessTokenHash && sha256(token) === order.accessTokenHash) authorized = true;
  }
  if (!authorized) return { ok: false, error: "You are not allowed to cancel this order." };

  if (!CANCELLABLE_STATUSES.has(order.status)) {
    return { ok: false, error: "This order has already entered fulfilment and can no longer be cancelled. Contact support." };
  }

  try {
    // The live RPC restocks inventory, records the order_event and notifies
    // the customer — cancellation must go through it, never a raw UPDATE.
    await updateOrderStatus({
      orderId,
      status: "cancelled",
      message: "Cancelled by the customer.",
      actor: customer ? `customer:${customer.id}` : "guest:self-cancel",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cancellation failed.";
    return { ok: false, error: message.includes("ORDER_NOT_FOUND") ? "Order not found." : "Cancellation failed. Please try again." };
  }

  revalidatePath("/profile/orders");
  revalidatePath(`/order/${orderId}`);
  revalidatePath("/admin/orders");
  return { ok: true, message: "Your order was cancelled. Any prepaid delivery charge is refunded by the team after verification." };
}
