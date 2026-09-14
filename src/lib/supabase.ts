"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function parseUrl(): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:" ? u.origin : null;
  } catch {
    return null;
  }
}

const validUrl = parseUrl();

/** True when both a valid URL and an anon key are present in the environment. */
export const supabaseConfigured = Boolean(validUrl && anonKey);

/**
 * Browser-side Supabase client. Safe for the anon key — it is public by design.
 * Null when the environment is not configured (the auth modal shows a notice then).
 */
export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(validUrl!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
