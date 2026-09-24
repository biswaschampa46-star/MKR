"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { addresses, customers, wishlistItems } from "@/db/schema";
import { getCurrentCustomer, hashPassword, verifyPassword } from "@/lib/auth/customer";
import { clearCustomerAvatar, setCustomerAvatar, deleteMediaAsset, storeUploadedFile } from "@/lib/data/media";
import { BUCKETS } from "@/lib/storage";
import { addressSchema } from "@/lib/validation";
import { upsertReview, deleteReview } from "@/lib/data/catalog";
import { markAllNotificationsRead, markNotificationRead, subscribeEmail } from "@/lib/data/content";
import { reviewSchema } from "@/lib/validation";
import type { ActionResult } from "@/types";

type FormState = ActionResult | undefined;

export async function updateProfileAction(_prev: FormState, formData: FormData): Promise<ActionResult> {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, error: "Please sign in again." };

  const fullName = String(formData.get("fullName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const marketingOptIn = formData.get("marketingOptIn") === "on";
  if (fullName.length < 2) return { ok: false, error: "Enter your full name." };

  await db
    .update(customers)
    .set({
      fullName,
      phone: phone || null,
      marketingOptIn,
      updatedAt: new Date(),
    })
    .where(eq(customers.id, customer.id));

  if (marketingOptIn) await subscribeEmail(customer.email, "profile");
  revalidatePath("/profile");
  revalidatePath("/profile/settings");
  return { ok: true, message: "Profile updated." };
}

export async function uploadAvatarAction(_prev: FormState, formData: FormData): Promise<ActionResult> {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, error: "Please sign in again." };
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose an image first." };

  try {
    const media = await storeUploadedFile({
      file,
      bucket: BUCKETS.profilePhotos,
      scope: `customers/${customer.id}`,
      slugOrId: "avatar",
      role: "avatar",
      altText: `${customer.fullName ?? customer.email} profile photo`,
      uploadedBy: `customer:${customer.id}`,
    });
    await setCustomerAvatar(customer.id, media.id);
    revalidatePath("/profile");
    revalidatePath("/profile/settings");
    return { ok: true, message: "Profile photo updated." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Upload failed." };
  }
}

export async function removeAvatarAction(): Promise<void> {
  const customer = await getCurrentCustomer();
  if (!customer) return;
  await clearCustomerAvatar(customer.id);
  revalidatePath("/profile/settings");
  
}

export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<ActionResult> {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, error: "Please sign in again." };
  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  if (next.length < 8) return { ok: false, error: "New password must be at least 8 characters." };

  const rows = await db.select().from(customers).where(eq(customers.id, customer.id)).limit(1);
  const ok = await verifyPassword(current, rows[0]?.passwordHash ?? null);
  if (!ok) return { ok: false, error: "Your current password is incorrect." };

  const passwordHash = await hashPassword(next);
  await db.update(customers).set({ passwordHash, updatedAt: new Date() }).where(eq(customers.id, customer.id));
  return { ok: true, message: "Password changed." };
}

/* ------------------------------- addresses -------------------------------- */
export async function saveAddressAction(_prev: FormState, formData: FormData): Promise<ActionResult> {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, error: "Please sign in again." };

  const parsed = addressSchema.safeParse({
    id: formData.get("id") || undefined,
    label: formData.get("label") ?? "",
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    addressLine: formData.get("addressLine"),
    district: formData.get("district"),
    area: formData.get("area") ?? "",
    postalCode: formData.get("postalCode") ?? "",
    notes: formData.get("notes") ?? "",
    isDefault: formData.get("isDefault") === "on",
  });
  if (!parsed.success) {
    return { ok: false, error: "Please review the address details.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const input = parsed.data;
  const values = {
    customerId: customer.id,
    label: input.label || null,
    fullName: input.fullName,
    phone: input.phone,
    addressLine: input.addressLine,
    district: input.district,
    area: input.area || null,
    postalCode: input.postalCode || null,
    notes: input.notes || null,
    isDefault: Boolean(input.isDefault),
    updatedAt: new Date(),
  };

  if (input.id) {
    await db.update(addresses).set(values).where(and(eq(addresses.id, input.id), eq(addresses.customerId, customer.id)));
  } else {
    const existingCount = await db.select({ id: addresses.id }).from(addresses).where(eq(addresses.customerId, customer.id));
    await db.insert(addresses).values({ ...values, isDefault: values.isDefault || existingCount.length === 0 });
  }

  revalidatePath("/profile/addresses");
  revalidatePath("/checkout");
  return { ok: true, message: "Address saved." };
}

export async function deleteAddressAction(formData: FormData): Promise<void> {
  const customer = await getCurrentCustomer();
  if (!customer) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await db.delete(addresses).where(and(eq(addresses.id, id), eq(addresses.customerId, customer.id)));
  revalidatePath("/profile/addresses");
  
}

export async function setDefaultAddressAction(formData: FormData): Promise<void> {
  const customer = await getCurrentCustomer();
  if (!customer) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await db.update(addresses).set({ isDefault: true, updatedAt: new Date() }).where(eq(addresses.id, id));
  revalidatePath("/profile/addresses");
  
}

/* --------------------------------- reviews -------------------------------- */
export async function submitReviewAction(_prev: FormState, formData: FormData): Promise<ActionResult> {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, error: "Sign in to write a review." };
  const parsed = reviewSchema.safeParse({
    productId: formData.get("productId"),
    rating: formData.get("rating"),
    title: formData.get("title") ?? "",
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Please review your feedback.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const result = await upsertReview({
    productId: parsed.data.productId,
    customerId: customer.id,
    rating: parsed.data.rating,
    title: parsed.data.title || null,
    body: parsed.data.body,
  });
  revalidatePath("/profile/reviews");
  return {
    ok: true,
    message: result.updated
      ? "Your review was updated and is awaiting moderation."
      : "Thanks! Your review is awaiting moderation.",
  };
}

export async function deleteOwnReviewAction(formData: FormData): Promise<void> {
  const customer = await getCurrentCustomer();
  if (!customer) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteReview(id);
  revalidatePath("/profile/reviews");
  
}

/* ------------------------------ notifications ----------------------------- */
export async function markNotificationReadAction(formData: FormData): Promise<void> {
  const customer = await getCurrentCustomer();
  if (!customer) return;
  const id = String(formData.get("id") ?? "");
  if (id) await markNotificationRead(customer.id, id);
  revalidatePath("/profile/notifications");
  
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const customer = await getCurrentCustomer();
  if (!customer) return;
  await markAllNotificationsRead(customer.id);
  revalidatePath("/profile/notifications");
  
}

/* -------------------------------- wishlist -------------------------------- */
export async function removeWishlistItemAction(formData: FormData): Promise<void> {
  const customer = await getCurrentCustomer();
  if (!customer) return;
  const id = String(formData.get("id") ?? "");
  if (id) await db.delete(wishlistItems).where(and(eq(wishlistItems.id, id), eq(wishlistItems.customerId, customer.id)));
  revalidatePath("/profile/wishlist");
  
}

export async function deleteAccountPhotoAction(formData: FormData): Promise<void> {
  const customer = await getCurrentCustomer();
  if (!customer) return;
  const id = String(formData.get("id") ?? "");
  if (id) {
    try {
      await deleteMediaAsset(id);
    } catch (error) {
      // Phase 23: never fail a profile action because the media is still referenced.
      if (!(error instanceof Error && error.message === "MEDIA_IN_USE")) throw error;
    }
  }
  revalidatePath("/profile/settings");
  
}

export async function changeEmailAction(_prev: FormState, formData: FormData): Promise<ActionResult> {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, error: "Please sign in again." };
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email.includes("@")) return { ok: false, error: "Enter a valid email address." };

  const rows = await db.select().from(customers).where(eq(customers.id, customer.id)).limit(1);
  const ok = await verifyPassword(password, rows[0]?.passwordHash ?? null);
  if (!ok) return { ok: false, error: "Password is incorrect." };

  const clash = await db.select({ id: customers.id }).from(customers).where(eq(customers.email, email)).limit(1);
  if (clash[0] && clash[0].id !== customer.id) return { ok: false, error: "That email is already registered." };

  await db.update(customers).set({ email, emailVerifiedAt: null, updatedAt: new Date() }).where(eq(customers.id, customer.id));
  return { ok: true, message: "Email updated — please verify your new address." };
}

export async function changeEmailFormAction(formData: FormData): Promise<void> {
  await changeEmailAction(undefined, formData);
}
