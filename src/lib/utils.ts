import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTaka(amount: number | null | undefined): string {
  const value = Number(amount ?? 0);
  return `৳${value.toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: "Unpaid",
  awaiting_verification: "Awaiting verification",
  verified: "Verified",
  failed: "Failed",
  refunded: "Refunded",
};

export function discountPercentOf(price: number, comparePrice: number | null): number {
  if (!comparePrice || comparePrice <= price) return 0;
  return Math.round(((comparePrice - price) / comparePrice) * 100);
}

/** Maps a Postgres exception message from the order RPC to a friendly message. */
export function friendlyOrderError(message: string): string {
  const [code, detail] = message.split(":");
  switch (code.replace(/^error:\s*/i, "").trim()) {
    case "CART_EMPTY":
      return "Your cart is empty.";
    case "OUT_OF_STOCK":
      return `Not enough stock for ${detail ?? "one of your items"}. Adjust the quantity and try again.`;
    case "PRODUCT_UNAVAILABLE":
      return `${detail ?? "A product in your cart"} is no longer available.`;
    case "VARIANT_MISSING":
      return `The selected size/colour for ${detail ?? "an item"} is no longer offered. Please re-add it.`;
    case "VARIANT_INACTIVE":
      return `The selected variant for ${detail ?? "an item"} is inactive. Please choose another.`;
    case "INVALID_QUANTITY":
      return "One of the quantities in your cart is invalid.";
    case "DELIVERY_ZONE_REQUIRED":
      return "Please select your delivery district.";
    case "PAYMENT_METHOD_INVALID":
      return "The selected payment method is not supported.";
    case "PAYMENT_PURPOSE_INVALID":
      return "Choose whether you are paying the delivery charge or the full order.";
    case "TRANSACTION_ID_REQUIRED":
      return "Enter the mobile payment transaction ID.";
    case "SENDER_NUMBER_REQUIRED":
      return "Enter the mobile number you paid from.";
    case "CUSTOMER_INFO_REQUIRED":
      return "Name, email and phone number are required.";
    case "COUPON_INVALID":
      return "That coupon code does not exist.";
    case "COUPON_INACTIVE":
      return "That coupon is no longer active.";
    case "COUPON_NOT_STARTED":
      return "That coupon is not active yet.";
    case "COUPON_EXPIRED":
      return "That coupon has expired.";
    case "COUPON_MIN_ORDER":
      return `Minimum order of ${detail} taka required for this coupon.`;
    case "COUPON_LIMIT_REACHED":
      return "That coupon has reached its usage limit.";
    case "COUPON_ALREADY_USED":
      return "You have already used that coupon.";
    case "ORDER_NOT_FOUND":
      return "Order not found.";
    default:
      return "We could not place your order. Please review the details and try again.";
  }
}

export function truncate(value: string | null | undefined, length = 120): string {
  if (!value) return "";
  return value.length > length ? `${value.slice(0, length - 1)}…` : value;
}

/* ─────────────── Social links (floating contact dock) ─────────────── */

export type SocialPlatform = "instagram" | "facebook" | "whatsapp";

const HTTP_SCHEME = /^https?:\/\//i;
const DOMAIN_LIKE = /^[a-z0-9][a-z0-9-]*(\.[a-z0-9-]+)+([/?#].*)?$/i;
const PHONE_LIKE = /^\+?\d[\d\s().-]*$/;

/**
 * Resolves an admin-configured social value into a usable href — never a
 * fake/default link:
 * - a full `http(s)://` URL is returned exactly as configured;
 * - a bare domain (`instagram.com/mkr`) gains the `https://` scheme;
 * - a bare number in the WhatsApp field becomes `https://wa.me/<digits>`.
 * Anything else (blank, `@handle`, free text, non-http schemes) returns `null`
 * so the caller can gracefully hide that option instead of linking nowhere.
 */
export function resolveSocialUrl(value: string | null | undefined, platform: SocialPlatform): string | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  if (HTTP_SCHEME.test(raw)) return raw;
  if (platform === "whatsapp" && PHONE_LIKE.test(raw)) {
    const digits = raw.replace(/\D/g, "");
    return digits.length >= 8 ? `https://wa.me/${digits}` : null;
  }
  if (DOMAIN_LIKE.test(raw)) return `https://${raw}`;
  return null;
}
