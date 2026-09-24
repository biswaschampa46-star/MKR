import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { customers } from "@/db/schema";
import { createServerAuthClient } from "@/lib/supabase/server";
import { mergeAnonymousCart } from "@/lib/data/commerce";
import { readCartToken } from "@/lib/auth/customer";

export const dynamic = "force-dynamic";

/** Supabase Auth OAuth / email-verification callback. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/profile";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? url.origin;

  const supabase = await createServerAuthClient();
  if (!supabase) {
    return NextResponse.redirect(`${siteUrl}/login?error=${encodeURIComponent("Supabase Auth is not configured")}`);
  }
  if (!code) {
    return NextResponse.redirect(`${siteUrl}/login?error=${encodeURIComponent("Missing authorization code")}`);
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user?.email) {
    return NextResponse.redirect(
      `${siteUrl}/login?error=${encodeURIComponent(error?.message ?? "Could not complete sign-in")}`,
    );
  }

  const email = data.user.email.toLowerCase();
  const existing = await db.select().from(customers).where(eq(customers.email, email)).limit(1);
  let customerId = existing[0]?.id;

  if (!customerId) {
    const inserted = await db
      .insert(customers)
      .values({
        email,
        authUserId: data.user.id,
        provider: "google",
        fullName: (data.user.user_metadata?.full_name as string | undefined) ?? null,
        emailVerifiedAt: data.user.email_confirmed_at ? new Date(data.user.email_confirmed_at) : new Date(),
      })
      .returning({ id: customers.id });
    customerId = inserted[0].id;
  } else if (!existing[0].authUserId) {
    await db.update(customers).set({ authUserId: data.user.id, updatedAt: new Date() }).where(eq(customers.id, customerId));
  }

  await mergeAnonymousCart(await readCartToken(), customerId);
  return NextResponse.redirect(`${siteUrl}${next.startsWith("/") ? next : "/profile"}`);
}
