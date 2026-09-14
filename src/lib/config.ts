/**
 * Store configuration — edit these values (or set env vars) to match the
 * real store. Nothing here is invented merchant data: payment numbers are
 * only surfaced when explicitly configured via environment variables.
 */

export const STORE = {
  name: "MKR",
  tagline: "Everyday style, elevated.",
  city: "Dhaka, Bangladesh",
};

/**
 * Payment collection numbers — read from env. When unset, checkout still
 * works: the customer places the order and the store follows up directly.
 * Never display a number that is not configured here.
 */
export function paymentNumber(method: string): string | null {
  switch (method) {
    case "bkash":
      return process.env.PAYMENT_BKASH_NUMBER || null;
    case "nagad":
      return process.env.PAYMENT_NAGAD_NUMBER || null;
    case "rocket":
      return process.env.PAYMENT_ROCKET_NUMBER || null;
    default:
      return null;
  }
}
