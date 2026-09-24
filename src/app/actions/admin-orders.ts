"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/admin";
import { updateOrderStatus, verifyOrderPayment } from "@/lib/data/commerce";
import { recordAdminAction } from "@/lib/admin-audit";
import { orderStatusSchema } from "@/lib/validation";
import type { ActionResult } from "@/types";

export async function updateOrderStatusAction(formData: FormData): Promise<void> {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login"); // Phase 26: never fail silently

  const parsed = orderStatusSchema.safeParse({
    orderId: formData.get("orderId"),
    status: formData.get("status"),
    message: formData.get("message") ?? "",
  });
  if (!parsed.success) return;

  try {
    await updateOrderStatus({
      orderId: parsed.data.orderId,
      status: parsed.data.status,
      message: parsed.data.message || null,
      actor: `admin:${admin.subject}`,
    });
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${parsed.data.orderId}`);
    revalidatePath("/profile/orders");
    await recordAdminAction({
      actor: `admin:${admin.subject}`,
      action: "order.status_change",
      target: parsed.data.orderId,
      metadata: { status: parsed.data.status },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update the order.";
    if (message.includes("ORDER_NOT_FOUND")) return;
    console.error("[MKR admin] order status update failed:", message);
  }
}

export async function verifyPaymentAction(formData: FormData): Promise<void> {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login"); // Phase 26: never fail silently
  const orderId = String(formData.get("orderId") ?? "");
  if (!orderId) return;
  try {
    await verifyOrderPayment(orderId, `admin:${admin.subject}`);
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    await recordAdminAction({
      actor: `admin:${admin.subject}`,
      action: "order.payment_verified",
      target: orderId,
    });
  } catch (error) {
    console.error("[MKR admin] payment verification failed:", error);
  }
}
