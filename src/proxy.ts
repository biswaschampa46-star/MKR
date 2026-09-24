import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Request proxy: refreshes the Supabase Auth session cookie (official
 * @supabase/ssr pattern for Next.js 16 proxy convention).
 * No-ops when Supabase is not configured, and never touches browser storage.
 */
export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let response = NextResponse.next({ request });
  if (!supabaseUrl || !supabaseAnonKey) return response;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) {
          response.cookies.set({ name, value, ...options });
        }
      },
    },
  });

  try {
    await supabase.auth.getUser();
  } catch {
    // Network/auth errors must never break page rendering.
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/realtime|api/media|.*\\.(?:svg|png|jpg|jpeg|webp|avif|gif|ico|mp4|webm)$).*)"],
};
