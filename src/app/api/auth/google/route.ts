import { NextResponse } from "next/server";
import { createServerAuthClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = url.searchParams.get("next") ?? "/profile";
  const siteUrl = env.siteUrl || url.origin;

  const supabase = await createServerAuthClient();
  if (!supabase) {
    return NextResponse.redirect(
      `${siteUrl}/login?error=${encodeURIComponent(
        "Google sign-in needs NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY plus the Google provider enabled in Supabase Auth.",
      )}`,
    );
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${siteUrl}/api/auth/callback?next=${encodeURIComponent(next)}` },
  });

  if (error || !data.url) {
    return NextResponse.redirect(
      `${siteUrl}/login?error=${encodeURIComponent(error?.message ?? "Google sign-in is unavailable")}`,
    );
  }
  return NextResponse.redirect(data.url);
}
