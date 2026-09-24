import { ensureCartToken, getCurrentCustomer, readCartToken } from "@/lib/auth/customer";
import type { CartIdentity } from "@/lib/data/commerce";

/** Read-only identity (safe in server components). */
export async function readCartIdentity(): Promise<CartIdentity> {
  const [customer, anonToken] = await Promise.all([getCurrentCustomer(), readCartToken()]);
  return { customerId: customer?.id ?? null, anonToken };
}

/** Mutation identity — may create the opaque anonymous cart cookie. */
export async function ensureCartIdentity(): Promise<CartIdentity> {
  const customer = await getCurrentCustomer();
  if (customer) return { customerId: customer.id, anonToken: null };
  const anonToken = await ensureCartToken();
  return { customerId: null, anonToken };
}
