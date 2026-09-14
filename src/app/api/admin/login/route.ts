import { NextResponse } from "next/server";
import { checkCredentials, setAdminCookie } from "@/lib/auth";

/* naive in-memory rate limit: 10 attempts / 10 min per IP */
const attempts = new Map<string, { n: number; reset: number }>();

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const rec = attempts.get(ip);
  if (rec && rec.reset > now && rec.n >= 10) {
    return NextResponse.json({ ok: false, message: "Too many attempts. Try again in a few minutes." }, { status: 429 });
  }

  let email = "";
  let password = "";
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    email = body.email ?? "";
    password = body.password ?? "";
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }

  if (!checkCredentials(email, password)) {
    if (!rec || rec.reset <= now) attempts.set(ip, { n: 1, reset: now + 10 * 60 * 1000 });
    else rec.n += 1;
    return NextResponse.json({ ok: false, message: "Wrong email or password." }, { status: 401 });
  }

  attempts.delete(ip);
  await setAdminCookie();
  return NextResponse.json({ ok: true });
}
