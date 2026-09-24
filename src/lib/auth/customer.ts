import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/db/client";
import { authTokens, customers, mediaAssets, sessions } from "@/db/schema";
import { createServerAuthClient } from "@/lib/supabase/server";
import type { CustomerProfile } from "@/types";

export const CUSTOMER_COOKIE = "mkr_session";
export const CART_COOKIE = "mkr_cart";
const SESSION_DAYS = 30;

export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
export const randomToken = (bytes = 32) => randomBytes(bytes).toString("hex");

export function customerProfileFrom(row: {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  provider: "email" | "google";
  emailVerifiedAt: Date | null;
  marketingOptIn: boolean;
  createdAt: Date;
  avatarUrl?: string | null;
}): CustomerProfile {
  return {
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    phone: row.phone,
    provider: row.provider,
    emailVerified: Boolean(row.emailVerifiedAt),
    marketingOptIn: row.marketingOptIn,
    createdAt: row.createdAt.toISOString(),
    avatarUrl: row.avatarUrl ?? null,
  };
}

/** Resolves the signed-in customer from the Supabase Auth session, then the internal session table. */
export async function getCurrentCustomer(): Promise<CustomerProfile | null> {
  try {
    const supabase = await createServerAuthClient();
    if (supabase) {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (user?.email) {
        const existing = await db.select().from(customers).where(eq(customers.email, user.email)).limit(1);
        if (existing[0]) return customerProfileFrom(existing[0]);
      }
    }
  } catch {
    // Fall through to the internal session check.
  }

  const store = await cookies();
  const token = store.get(CUSTOMER_COOKIE)?.value;
  if (!token) return null;
  const tokenHash = sha256(token);

  const rows = await db
    .select({
      customer: customers,
      avatarUrl: mediaAssets.publicUrl,
    })    .from(sessions)
    .innerJoin(customers, eq(customers.id, sessions.customerId))
    .leftJoin(mediaAssets, eq(mediaAssets.id, customers.avatarMediaId))
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date())))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  if (row.customer.status === "blocked") return null;
  return customerProfileFrom({ ...row.customer, avatarUrl: avatarUrlFor(row.customer.avatarMediaId, row.avatarUrl) });
}

/**
 * Profile photos live in a PRIVATE Storage bucket (migration 0008): the
 * stored `public_url` is only usable while the database driver is active.
 * For Storage-backed avatars every viewer — including the owner — is served
 * through /api/media/{id}, which authorizes and hands out a short-lived
 * signed URL per request.
 */
function avatarUrlFor(avatarMediaId: string | null, storedUrl: string | null): string | null {
  if (!avatarMediaId) return null;
  if (storedUrl?.startsWith("/api/media/")) return storedUrl;
  return `/api/media/${avatarMediaId}`;
}

export async function requireCustomer(returnTo = "/profile"): Promise<CustomerProfile> {
  const customer = await getCurrentCustomer();
  if (!customer) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  return customer;
}

export function assertCustomer(customer: CustomerProfile | null): CustomerProfile {
  if (!customer) throw new Error("You need to sign in to continue.");
  return customer;
}

export async function createCustomerSession(customerId: string, userAgent?: string | null): Promise<void> {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({
    customerId,
    tokenHash: sha256(token),
    userAgent: userAgent?.slice(0, 200) ?? null,
    expiresAt,
  });
  const store = await cookies();
  store.set({
    name: CUSTOMER_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function destroyCustomerSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(CUSTOMER_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.tokenHash, sha256(token)));
  }
  store.set({ name: CUSTOMER_COOKIE, value: "", httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  const supabase = await createServerAuthClient();
  if (supabase) await supabase.auth.signOut();
}

/* ------------------------------- credentials ------------------------------ */
export async function hashPassword(password: string) {
  return bcrypt.hash(password, 11);
}

export async function verifyPassword(password: string, hash: string | null) {
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}

export type TokenKind = "verify_email" | "reset_password";

export async function createAuthToken(customerId: string, kind: TokenKind, ttlMinutes: number) {
  const token = randomToken(32);
  await db.insert(authTokens).values({
    customerId,
    kind,
    tokenHash: sha256(token),
    expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000),
  });
  return token;
}

export async function consumeAuthToken(token: string, kind: TokenKind) {
  const rows = await db
    .select()
    .from(authTokens)
    .where(and(eq(authTokens.tokenHash, sha256(token)), eq(authTokens.kind, kind)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (row.usedAt) return null;
  if (row.expiresAt.getTime() < Date.now()) return null;
  await db.update(authTokens).set({ usedAt: new Date() }).where(eq(authTokens.id, row.id));
  return row.customerId;
}

/* --------------------------------- cart ---------------------------------- */
/** Read-only cart identity lookup — safe inside server components. */
export async function readCartToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(CART_COOKIE)?.value ?? null;
}

/** Creates the opaque anonymous cart cookie. Only call from Route Handlers / Server Actions. */
export async function ensureCartToken(): Promise<string> {
  const store = await cookies();
  const existing = store.get(CART_COOKIE)?.value;
  if (existing) return existing;
  const token = randomToken(24);
  store.set({
    name: CART_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 60,
  });
  return token;
}

export async function clearCartToken(): Promise<void> {
  const store = await cookies();
  store.set({ name: CART_COOKIE, value: "", httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
}
