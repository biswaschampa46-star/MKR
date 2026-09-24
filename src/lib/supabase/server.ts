import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { env, supabaseAdminConfigured } from "@/lib/env";

/**
 * Service-role Supabase client. Server only — never import from a client
 * component. Returns null when the project is not configured, and every
 * caller must handle that with an explicit, user-visible error.
 */
export function createServiceClient(): SupabaseClient | null {
  if (!supabaseAdminConfigured()) return null;
  return createClient(env.supabaseUrl!, env.supabaseServiceRoleKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "X-Client-Info": "mkr-server" } },
  });
}

/** Cookie-bound Supabase Auth client (official @supabase/ssr session mechanism). */
export async function createServerAuthClient() {
  if (!env.supabaseUrl || !env.supabaseAnonKey) return null;
  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll().map((c) => ({ name: c.name, value: c.value })),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) {
            cookieStore.set({ name, value, ...options });
          }
        } catch {
          // Called from a Server Component render — the proxy handles refresh.
        }
      },
    },
  });
}
