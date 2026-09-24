"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { customers } from "@/db/schema";
import { getAdminSession } from "@/lib/auth/admin";
import { deleteCoupon, saveCoupon } from "@/lib/data/commerce";
import { moderateReview, deleteReview } from "@/lib/data/catalog";
import { recordAdminAction } from "@/lib/admin-audit";
import {
  createNotification,
  deleteMessage,
  deleteNotification,
  deleteSubscriber,
  setMessageStatus,
} from "@/lib/data/content";
import { publishRealtimeEvent } from "@/lib/realtime";
import { couponSchema, notificationSchema, reviewModerationSchema } from "@/lib/validation";
import type { ActionResult } from "@/types";

type FormState = ActionResult | undefined;

export async function saveCouponAction(_prev: FormState, formData: FormData): Promise<ActionResult> {
  const admin = await getAdminSession();
  if (!admin) return { ok: false, error: "Admin session expired." };

  const toDate = (value: FormDataEntryValue | null) => {
    const raw = String(value ?? "").trim();
    if (!raw) return null;
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const parsed = couponSchema.safeParse({
    id: formData.get("id") ? String(formData.get("id")) : undefined,
    code: String(formData.get("code") ?? "").toUpperCase(),
    description: String(formData.get("description") ?? ""),
    discountType: String(formData.get("discountType") ?? "percentage"),
    discountValue: formData.get("discountValue"),
    maxDiscountAmount: formData.get("maxDiscountAmount") ? formData.get("maxDiscountAmount") : null,
    minOrderAmount: formData.get("minOrderAmount") ?? 0,
    startsAt: "",
    expiresAt: "",
    usageLimit: formData.get("usageLimit") ? formData.get("usageLimit") : null,
    perUserLimit: formData.get("perUserLimit") ?? 1,
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) {
    return { ok: false, error: "Please review the coupon details.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await saveCoupon({
      id: parsed.data.id,
      code: parsed.data.code,
      description: parsed.data.description || null,
      discountType: parsed.data.discountType,
      discountValue: parsed.data.discountValue,
      maxDiscountAmount: parsed.data.maxDiscountAmount ?? null,
      minOrderAmount: parsed.data.minOrderAmount,
      startsAt: toDate(formData.get("startsAt")),
      expiresAt: toDate(formData.get("expiresAt")),
      usageLimit: parsed.data.usageLimit ?? null,
      perUserLimit: parsed.data.perUserLimit,
      isActive: Boolean(parsed.data.isActive),
    });
    await recordAdminAction({
      actor: `admin:${admin.subject}`,
      action: "coupon.save",
      target: parsed.data.id ?? null,
      metadata: { code: parsed.data.code, discountType: parsed.data.discountType, discountValue: parsed.data.discountValue },
    });
    revalidatePath("/admin/discounts");
    return { ok: true, message: "Coupon saved." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save the coupon.";
    if (message.includes("coupons_code_key")) return { ok: false, error: "That coupon code already exists." };
    return { ok: false, error: message };
  }
}

export async function deleteCouponAction(formData: FormData): Promise<void> {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login"); // Phase 26: never fail silently
  const id = String(formData.get("id") ?? "");
  if (id) await deleteCoupon(id);
  revalidatePath("/admin/discounts");
  
}

export async function moderateReviewAction(formData: FormData): Promise<void> {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login"); // Phase 26: never fail silently
  const parsed = reviewModerationSchema.safeParse({
    reviewId: formData.get("reviewId"),
    status: formData.get("status"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return;

  if (parsed.data.status === "rejected" && formData.get("hardDelete") === "on") {
    await deleteReview(parsed.data.reviewId);
  } else {
    await moderateReview(parsed.data.reviewId, parsed.data.status, parsed.data.note || null);
  }
  revalidatePath("/admin/reviews");
  revalidatePath("/shop");
  
}

export async function deleteReviewAction(formData: FormData): Promise<void> {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login"); // Phase 26: never fail silently
  const id = String(formData.get("reviewId") ?? "");
  if (id) await deleteReview(id);
  revalidatePath("/admin/reviews");
  
}

export async function setMessageStatusAction(formData: FormData): Promise<void> {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login"); // Phase 26: never fail silently
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "read") as "new" | "read" | "archived";
  if (id) await setMessageStatus(id, status);
  revalidatePath("/admin/messages");
  
}

export async function deleteMessageAction(formData: FormData): Promise<void> {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login"); // Phase 26: never fail silently
  const id = String(formData.get("id") ?? "");
  if (id) await deleteMessage(id);
  revalidatePath("/admin/messages");
  
}

export async function deleteSubscriberAction(formData: FormData): Promise<void> {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login"); // Phase 26: never fail silently
  const id = String(formData.get("id") ?? "");
  if (id) await deleteSubscriber(id);
  revalidatePath("/admin/subscribers");
  
}

export async function broadcastNotificationAction(_prev: FormState, formData: FormData): Promise<ActionResult> {
  const admin = await getAdminSession();
  if (!admin) return { ok: false, error: "Admin session expired." };
  const parsed = notificationSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    body: String(formData.get("body") ?? ""),
    link: String(formData.get("link") ?? ""),
    kind: String(formData.get("kind") ?? "info"),
    customerId: formData.get("customerId") ? String(formData.get("customerId")) : null,
  });
  if (!parsed.success) return { ok: false, error: "Please review the notification." };

  const broadcastAll = formData.get("broadcastAll") === "on";
  await createNotification({
    customerId: broadcastAll ? null : parsed.data.customerId ?? null,
    audience: broadcastAll ? "all" : "customer",
    kind: parsed.data.kind,
    title: parsed.data.title,
    body: parsed.data.body || null,
    link: parsed.data.link || null,
  });
  await publishRealtimeEvent("notifications", "notification.created", { title: parsed.data.title, broadcastAll });
  revalidatePath("/admin/notifications");
  return { ok: true, message: broadcastAll ? "Broadcast sent to all customers." : "Notification sent." };
}

export async function deleteNotificationAction(formData: FormData): Promise<void> {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login"); // Phase 26: never fail silently
  const id = String(formData.get("id") ?? "");
  if (id) await deleteNotification(id);
  revalidatePath("/admin/notifications");
  
}

export async function setCustomerStatusAction(formData: FormData): Promise<void> {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login"); // Phase 26: never fail silently
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "active") as "active" | "blocked";
  if (!id) return;
  await db.update(customers).set({ status, updatedAt: new Date() }).where(eq(customers.id, id));
  await recordAdminAction({ actor: `admin:${admin.subject}`, action: "customer.status_change", target: id, metadata: { status } });
  revalidatePath("/admin/customers");
  
}
