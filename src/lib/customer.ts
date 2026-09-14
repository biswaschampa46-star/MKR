"use client";

import { supabase } from "./supabase";
import type { User } from "@supabase/supabase-js";

/* ─────────────────────────────────────────────────────────────────────
   Customer profile system — every call below runs through the browser
   Supabase client, so RLS guarantees a customer can only ever touch
   their own rows (user_id = auth.uid()).
   ───────────────────────────────────────────────────────────────────── */

export type CustomerProfile = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  profile_photo: string;
  date_of_birth: string | null;
  gender: string | null;
  account_status: string;
  notification_prefs: { orderUpdates: boolean; promotions: boolean; email: boolean };
  profile_visibility: string;
  created_at: string;
  updated_at: string;
  last_login_at: string;
};

export type CustomerAddress = {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  division: string;
  district: string;
  upazila: string;
  address: string;
  postal_code: string;
  label: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export type OrderItemJson = {
  productId: string;
  slug: string;
  name: string;
  image: string;
  variant: string;
  price: number;
  qty: number;
  attributes?: { label: string; value: string }[];
};

export type CustomerOrder = {
  id: string;
  order_number: string;
  user_id: string | null;
  customer_name: string;
  phone: string;
  email: string | null;
  address: string;
  city: string;
  payment_method: string;
  payment_purpose: string;
  amount_paid: number;
  cod_amount: number;
  delivery_payment_status: string;
  product_payment_status: string;
  subtotal: number;
  shipping_fee: number;
  total: number;
  discount: number;
  coupon_code: string | null;
  delivery_zone: string;
  items: OrderItemJson[];
  status: string;
  created_at: string;
  updated_at: string;
};

export type CustomerNotification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
};

/* ───────────────────────── profile ───────────────────────── */

export async function ensureCustomerProfile(user: User): Promise<CustomerProfile | null> {
  if (!supabase) return null;
  try {
    await supabase.rpc("ensure_customer_profile");
  } catch {
    /* non-fatal — fall through to a plain read */
  }
  const { data } = await supabase
    .from("customer_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  return (data as CustomerProfile) ?? null;
}

export async function fetchProfile(userId: string): Promise<CustomerProfile | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from("customer_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as CustomerProfile) ?? null;
}

export type ProfileUpdate = Partial<{
  full_name: string;
  phone: string;
  profile_photo: string;
  date_of_birth: string | null;
  gender: string | null;
  account_status: string;
  notification_prefs: { orderUpdates: boolean; promotions: boolean; email: boolean };
  profile_visibility: string;
}>;

export async function updateProfile(userId: string, patch: ProfileUpdate) {
  if (!supabase) return { ok: false as const, message: "Not connected." };
  const { error } = await supabase
    .from("customer_profiles")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  return error ? { ok: false as const, message: error.message } : { ok: true as const };
}
/* ───────────────────────── profile photos ───────────────────────── */

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function uploadProfilePhoto(userId: string, file: File) {
  if (!supabase) return { ok: false as const, message: "Not connected." };
  if (!PHOTO_TYPES.has(file.type)) return { ok: false as const, message: "Use a JPG, PNG or WebP image." };
  if (file.size > MAX_PHOTO_BYTES) return { ok: false as const, message: "Photo must be under 2 MB." };
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage.from("profile-photos").upload(path, file, { upsert: false, cacheControl: "3600" });
  if (upErr) return { ok: false as const, message: upErr.message };
  const { data } = supabase.storage.from("profile-photos").getPublicUrl(path);
  return { ok: true as const, url: data.publicUrl, path };
}

export async function removeProfilePhotoFile(path: string) {
  if (!supabase || !path.includes("/profile-photos/")) return;
  const objectPath = path.split("/profile-photos/")[1];
  if (objectPath) await supabase.storage.from("profile-photos").remove([objectPath]);
}

/* ───────────────────────── orders ───────────────────────── */

export async function fetchMyOrders(userId: string): Promise<CustomerOrder[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  return (data as CustomerOrder[]) ?? [];
}

/* ───────────────────────── addresses ───────────────────────── */

export async function fetchAddresses(userId: string): Promise<CustomerAddress[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("customer_addresses")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  return (data as CustomerAddress[]) ?? [];
}

export type AddressInput = Omit<CustomerAddress, "id" | "user_id" | "created_at" | "updated_at">;

export async function saveAddress(userId: string, values: AddressInput, addressId?: string) {
  if (!supabase) return { ok: false as const, message: "Not connected." };
  const clean = { ...values, phone: values.phone.replace(/[\s-]/g, "") };
  const res = addressId
    ? await supabase.from("customer_addresses").update({ ...clean, updated_at: new Date().toISOString() }).eq("id", addressId).eq("user_id", userId)
    : await supabase.from("customer_addresses").insert({ ...clean, user_id: userId });
  return res.error ? { ok: false as const, message: res.error.message } : { ok: true as const };
}

export async function deleteAddress(userId: string, addressId: string) {
  if (!supabase) return { ok: false as const, message: "Not connected." };
  const { error } = await supabase.from("customer_addresses").delete().eq("id", addressId).eq("user_id", userId);
  return error ? { ok: false as const, message: error.message } : { ok: true as const };
}

export async function setDefaultAddress(userId: string, addressId: string) {
  if (!supabase) return { ok: false as const, message: "Not connected." };
  await supabase.from("customer_addresses").update({ is_default: false, updated_at: new Date().toISOString() }).eq("user_id", userId).eq("is_default", true);
  const { error } = await supabase.from("customer_addresses").update({ is_default: true, updated_at: new Date().toISOString() }).eq("id", addressId).eq("user_id", userId);
  return error ? { ok: false as const, message: error.message } : { ok: true as const };
}
/* ───────────────────────── wishlist ───────────────────────── */

export type WishlistEntry = {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  product?: {
    id: string;
    slug: string;
    name: string;
    image: string;
    price: number;
    stock: number;
    variants: { name: string; options: string[] }[] | null;
  } | null;
};

export async function fetchWishlist(userId: string): Promise<WishlistEntry[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("wishlists")
    .select(
      "id, user_id, product_id, created_at, product:products (id, slug, name, image, price, stock, variants)",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data as unknown as WishlistEntry[]) ?? [];
}

export async function addToWishlist(userId: string, productId: string) {
  if (!supabase) return { ok: false as const, message: "Not connected." };
  const { error } = await supabase.from("wishlists").insert({ user_id: userId, product_id: productId });
  if (error && (error as { code?: string }).code !== "23505") return { ok: false as const, message: error.message };
  return { ok: true as const };
}

export async function removeFromWishlist(userId: string, productId: string) {
  if (!supabase) return { ok: false as const, message: "Not connected." };
  const { error } = await supabase.from("wishlists").delete().eq("user_id", userId).eq("product_id", productId);
  return error ? { ok: false as const, message: error.message } : { ok: true as const };
}

export async function fetchWishlistIds(userId: string): Promise<Set<string>> {
  if (!supabase) return new Set();
  const { data } = await supabase.from("wishlists").select("product_id").eq("user_id", userId);
  return new Set((data ?? []).map((r) => (r as { product_id: string }).product_id));
}
/* ───────────────────────── notifications ───────────────────────── */

export async function fetchNotifications(userId: string): Promise<CustomerNotification[]> {
  if (!supabase) return [];
  const { data } = await supabase.from("customer_notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50);
  return (data as CustomerNotification[]) ?? [];
}

export async function markNotificationRead(userId: string, id: string, read = true) {
  if (!supabase) return { ok: false as const, message: "Not connected." };
  const { error } = await supabase.from("customer_notifications").update({ is_read: read }).eq("id", id).eq("user_id", userId);
  return error ? { ok: false as const, message: error.message } : { ok: true as const };
}

export async function markAllNotificationsRead(userId: string) {
  if (!supabase) return { ok: false as const, message: "Not connected." };
  const { error } = await supabase.from("customer_notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
  return error ? { ok: false as const, message: error.message } : { ok: true as const };
}

export async function deleteNotification(userId: string, id: string) {
  if (!supabase) return { ok: false as const, message: "Not connected." };
  const { error } = await supabase.from("customer_notifications").delete().eq("id", id).eq("user_id", userId);
  return error ? { ok: false as const, message: error.message } : { ok: true as const };
}

export async function fetchUnreadCount(userId: string): Promise<number> {
  if (!supabase) return 0;
  const { count } = await supabase.from("customer_notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_read", false);
  return count ?? 0;
}

/* ───────────────────────── reviews ───────────────────────── */

export type CustomerReview = {
  id: string;
  user_id: string | null;
  product_id: string;
  name: string;
  rating: number;
  review: string;
  verified_purchase: boolean;
  approved: boolean;
  created_at: string;
  product?: { name: string; image: string; slug: string } | null;
};

export async function fetchMyReviews(userId: string): Promise<CustomerReview[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("product_reviews")
    .select("id, user_id, product_id, name, rating, review, verified_purchase, approved, created_at, product:products (name, image, slug)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data as unknown as CustomerReview[]) ?? [];
}

export async function deleteMyReview(userId: string, reviewId: string) {
  if (!supabase) return { ok: false as const, message: "Not connected." };
  const { error } = await supabase.from("product_reviews").delete().eq("id", reviewId).eq("user_id", userId);
  return error ? { ok: false as const, message: error.message } : { ok: true as const };
}

/* ───────────────────────── validation ───────────────────────── */

export const BD_PHONE = /^(?:\+?88)?01[3-9]\d{8}$/;
export function isValidBdPhone(raw: string): boolean {
  return BD_PHONE.test(raw.replace(/[\s-]/g, ""));
}