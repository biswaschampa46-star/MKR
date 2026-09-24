import { cookies } from "next/headers";
import { getCurrentCustomer, sha256 } from "@/lib/auth/customer";
import { getOrderAccessHash, getOrderDetail } from "@/lib/data/commerce";
import type { OrderDetail } from "@/types";

export const ORDER_ACCESS_COOKIE_PREFIX = "mkr_order_";

/**
 * An order is readable only by its owner: the signed-in customer that placed it,
 * or a browser holding the opaque one-time access token issued at checkout.
 */
export async function authorizeOrderView(orderId: string): Promise<OrderDetail | null> {
  const access = await getOrderAccessHash(orderId);
  if (!access) return null;

  const customer = await getCurrentCustomer();
  if (customer && access.customerId === customer.id) {
    return getOrderDetail(orderId);
  }
  if (access.customerId) {
    // Orders tied to an account are never exposed to guests.
    return null;
  }

  const store = await cookies();
  const token = store.get(`${ORDER_ACCESS_COOKIE_PREFIX}${orderId}`)?.value;
  if (!token || !access.hash) return null;
  if (sha256(token) !== access.hash) return null;

  return getOrderDetail(orderId);
}
