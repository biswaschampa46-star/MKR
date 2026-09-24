import { createHmac, randomBytes, timingSafeEqual, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/db/client";
import { settings } from "@/db/schema";
import { env } from "@/lib/env";

export const ADMIN_COOKIE = "mkr_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

type SessionPayload = { sub: string; exp: number; v: 1 };

const b64url = (value: Buffer | string) => Buffer.from(value).toString("base64url");

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Session signing secret: ADMIN_SESSION_SECRET when configured, otherwise a
 * random server-side secret generated once and persisted in PostgreSQL. The
 * value never leaves the server.
 */
async function getSigningSecret(): Promise<string> {
  if (env.adminSessionSecret) return env.adminSessionSecret;
  const existing = await db.select().from(settings).where(eq(settings.key, "admin.session_secret")).limit(1);
  const stored = existing[0]?.value as { secret?: string } | undefined;
  if (stored?.secret) return stored.secret;
  const generated = randomBytes(48).toString("hex");
  await db
    .insert(settings)
    .values({ key: "admin.session_secret", value: { secret: generated }, description: "Auto-generated admin session signing secret" })
    .onConflictDoUpdate({ target: settings.key, set: { value: { secret: generated }, updatedAt: new Date() } });
  return generated;
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export type AdminCredentialState = {
  configured: boolean;
  source: "environment" | "database" | "none";
  email: string | null;
};

export async function adminCredentialState(): Promise<AdminCredentialState> {
  if (env.adminEmail && env.adminPassword) {
    return { configured: true, source: "environment", email: env.adminEmail };
  }
  const row = await db.select().from(settings).where(eq(settings.key, "admin.credential")).limit(1);
  const value = row[0]?.value as { email?: string; passwordHash?: string } | undefined;
  if (value?.email && value?.passwordHash) {
    return { configured: true, source: "database", email: value.email };
  }
  return { configured: false, source: "none", email: null };
}

/** Only possible while no admin credential exists anywhere. */
export async function bootstrapAdminCredential(email: string, password: string): Promise<void> {
  const state = await adminCredentialState();
  if (state.configured) {
    throw new Error("Admin credentials are already configured. Use the login form instead.");
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await db
    .insert(settings)
    .values({
      key: "admin.credential",
      value: { email: email.trim().toLowerCase(), passwordHash },
      description: "Admin login credential (bcrypt hash, server-side only)",
    })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: { email: email.trim().toLowerCase(), passwordHash }, updatedAt: new Date() },
    });
}

export async function verifyAdminCredentials(email: string, password: string): Promise<boolean> {
  const candidate = email.trim().toLowerCase();
  if (env.adminEmail && env.adminPassword) {
    const emailOk = safeCompare(candidate, env.adminEmail.trim().toLowerCase());
    const passOk = safeCompare(password, env.adminPassword);
    if (emailOk && passOk) return true;
  }
  const row = await db.select().from(settings).where(eq(settings.key, "admin.credential")).limit(1);
  const value = row[0]?.value as { email?: string; passwordHash?: string } | undefined;
  if (value?.email && value.passwordHash) {
    const emailOk = safeCompare(candidate, value.email.toLowerCase());
    const passOk = await bcrypt.compare(password, value.passwordHash);
    if (emailOk && passOk) return true;
  }
  return false;
}

export async function createAdminSession(email: string): Promise<void> {
  const secret = await getSigningSecret();
  const payload: SessionPayload = {
    sub: createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 24),
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    v: 1,
  };
  const encoded = b64url(JSON.stringify(payload));
  const token = `${encoded}.${sign(encoded, secret)}`;
  const store = await cookies();
  store.set({
    name: ADMIN_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function destroyAdminSession(): Promise<void> {
  const store = await cookies();
  store.set({ name: ADMIN_COOKIE, value: "", httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
}

export type AdminSessionInfo = { subject: string; expiresAt: number };

export async function getAdminSession(): Promise<AdminSessionInfo | null> {
  const store = await cookies();
  const raw = store.get(ADMIN_COOKIE)?.value;
  if (!raw) return null;
  const [encoded, signature] = raw.split(".");
  if (!encoded || !signature) return null;
  let secret: string;
  try {
    secret = await getSigningSecret();
  } catch {
    return null;
  }
  const expected = sign(encoded, secret);
  if (!safeCompare(signature, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SessionPayload;
    if (payload.v !== 1) return null;
    if (payload.exp * 1000 < Date.now()) return null;
    return { subject: payload.sub, expiresAt: payload.exp };
  } catch {
    return null;
  }
}

export async function requireAdmin(): Promise<AdminSessionInfo> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}
