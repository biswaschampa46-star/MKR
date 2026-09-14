import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Server-side verification of a customer's Supabase access token.
 * Used by the checkout API so an order is linked to a real, authenticated
 * user — the caller can never just pass an arbitrary user_id.
 *
 * The same public (anon/publishable) key the browser uses is fine here:
 * identity is enforced by the token itself via auth.getUser(token).
 */
export async function verifyUserToken(accessToken: string | undefined): Promise<{
  ok: boolean;
  userId?: string;
  email?: string;
  reason?: string;
}> {
  if (!url || !anonKey || !accessToken) {
    return { ok: false, reason: "missing auth" };
  }
  try {
    const client = createClient(url, anonKey, { auth: { persistSession: false } });
    const { data, error } = await client.auth.getUser(accessToken);
    if (error || !data.user) {
      return { ok: false, reason: "invalid token" };
    }
    return { ok: true, userId: data.user.id, email: data.user.email };
  } catch {
    return { ok: false, reason: "verify failed" };
  }
}