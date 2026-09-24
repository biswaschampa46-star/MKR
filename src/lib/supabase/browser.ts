"use client";

import { createBrowserClient } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Browser Supabase client for Auth session + Realtime subscriptions.
 * Uses the official @supabase/ssr cookie storage — no localStorage.
 * Returns null when the project is not configured so the UI can explain why.
 */
export function getBrowserSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  if (!client) {
    client = createBrowserClient(url, anonKey, {
      isSingleton: true,
      realtime: { params: { eventsPerSecond: 5 } },
    });
  }
  return client;
}

export const supabaseRealtimeConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

/** Only branding assets may ever touch browser storage (MKR logo / loader logo). */
export const BRANDING_STORAGE_KEY = "mkr.branding.logo";
export function readBrandingLogo(): string | null {
  try {
    return window.localStorage.getItem(BRANDING_STORAGE_KEY);
  } catch {
    return null;
  }
}
export function writeBrandingLogo(dataUrl: string) {
  try {
    window.localStorage.setItem(BRANDING_STORAGE_KEY, dataUrl);
  } catch {
    /* ignore */
  }
}
