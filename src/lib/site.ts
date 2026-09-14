/**
 * Centralized production site-URL resolution.
 *
 * Priority:
 *   1. NEXT_PUBLIC_SITE_URL (public, preferred — set to the production domain in Vercel)
 *   2. SITE_URL (server-side equivalent, kept for backwards compatibility)
 *   3. VERCEL_URL (automatic on Vercel preview + production when no custom domain is set)
 *   4. http://localhost:3000 (local development only)
 *
 * Never hardcode localhost anywhere else — import from here instead.
 */
export function getSiteUrl(): string {
  const publicUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (publicUrl) return publicUrl.replace(/\/$/, "");

  const serverUrl = process.env.SITE_URL?.trim();
  if (serverUrl) return serverUrl.replace(/\/$/, "");

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    const host = vercelUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return `https://${host}`;
  }

  return "http://localhost:3000";
}

/** Value for the OpenRouter `HTTP-Referer` header — same resolution, always absolute. */
export function getRefererUrl(): string {
  return getSiteUrl();
}
