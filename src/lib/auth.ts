import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "mkr_admin_session";
const SESSION_DAYS = 7;

function secret(): string {
  return process.env.ADMIN_SESSION_SECRET || "mkr-casual-dev-secret";
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

export function createSessionToken(): string {
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  return `${exp}.${sign(String(exp))}`;
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const [exp, mac] = token.split(".");
  if (!exp || !mac) return false;
  const expected = sign(exp);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  return Number(exp) > Date.now();
}

export function checkCredentials(email: string, password: string): boolean {
  const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const adminPass = process.env.ADMIN_PASSWORD || "";
  if (!adminEmail || !adminPass) return false;
  const e = Buffer.from(email.trim().toLowerCase());
  const p = Buffer.from(password);
  const eOk = e.length === Buffer.byteLength(adminEmail) && timingSafeEqual(e, Buffer.from(adminEmail));
  const pOk = p.length === Buffer.byteLength(adminPass) && timingSafeEqual(p, Buffer.from(adminPass));
  return eOk && pOk;
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(COOKIE_NAME)?.value);
}

export async function setAdminCookie(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearAdminCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export const unauthorized = (): Response =>
  new Response(JSON.stringify({ ok: false, message: "Unauthorized" }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
