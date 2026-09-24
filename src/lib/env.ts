/**
 * Central environment access. Never log or expose values from here.
 * Values are read lazily so a missing optional variable cannot break the build.
 */

const read = (key: string): string | undefined => {
  const raw = process.env[key];
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  return trimmed.length === 0 ? undefined : trimmed;
};

export const env = {
  get databaseUrl() {
    return read("DATABASE_URL");
  },
  get supabaseUrl() {
    return read("NEXT_PUBLIC_SUPABASE_URL");
  },
  get supabaseAnonKey() {
    return read("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  },
  get supabaseServiceRoleKey() {
    return read("SUPABASE_SERVICE_ROLE_KEY");
  },
  get adminEmail() {
    return read("ADMIN_EMAIL");
  },
  get adminPassword() {
    return read("ADMIN_PASSWORD");
  },
  get adminSessionSecret() {
    return read("ADMIN_SESSION_SECRET");
  },
  get openRouterKey() {
    return read("OPENROUTER_API_KEY") ?? read("OPENROUTER_API_KEY_FOR_ADMINPANEL_PRODUCT");
  },
  get openRouterModel() {
    return read("OPENROUTER_MODEL") ?? "openai/gpt-4o-mini";
  },
  get openRouterBaseUrl() {
    return read("OPENROUTER_BASE_URL") ?? read("AI_BASE_URL") ?? "https://openrouter.ai/api/v1";
  },
  get aiModels() {
    const raw = read("AI_MODELS");
    if (!raw) return [] as string[];
    return raw
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);
  },
  get siteUrl() {
    // VERCEL_URL is injected by the platform on every Vercel deployment
    // (deployment-specific host, e.g. mkr-abc123.vercel.app). It is only a
    // fallback so a deployment that forgot NEXT_PUBLIC_SITE_URL still emits
    // real https URLs in metadata / sitemap / structured data instead of
    // localhost. Locally VERCEL_URL is undefined → stays localhost:3000.
    const vercelUrl = read("VERCEL_URL");
    return (
      read("NEXT_PUBLIC_SITE_URL") ??
      read("SITE_URL") ??
      (vercelUrl ? `https://${vercelUrl}` : undefined) ??
      "http://localhost:3000"
    );
  },
  get paymentNumbers() {
    return {
      bkash: read("PAYMENT_BKASH_NUMBER"),
      nagad: read("PAYMENT_NAGAD_NUMBER"),
      rocket: read("PAYMENT_ROCKET_NUMBER"),
    };
  },
};

export const supabasePublicConfigured = () => Boolean(env.supabaseUrl && env.supabaseAnonKey);
export const supabaseAdminConfigured = () =>
  Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);

export type EnvCheck = {
  name: string;
  configured: boolean;
  purpose: string;
  required: boolean;
};

/** Diagnostics list — names and booleans only, never values. */
export function environmentReport(): EnvCheck[] {
  return [
    { name: "DATABASE_URL", configured: Boolean(env.databaseUrl), purpose: "PostgreSQL (Supabase) connection", required: true },
    { name: "NEXT_PUBLIC_SUPABASE_URL", configured: Boolean(env.supabaseUrl), purpose: "Supabase project URL (Auth, Storage, Realtime)", required: false },
    { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", configured: Boolean(env.supabaseAnonKey), purpose: "Supabase anon key for browser Auth session", required: false },
    { name: "SUPABASE_SERVICE_ROLE_KEY", configured: Boolean(env.supabaseServiceRoleKey), purpose: "Server-side Supabase Storage uploads", required: false },
    { name: "ADMIN_EMAIL", configured: Boolean(env.adminEmail), purpose: "Admin panel login", required: false },
    { name: "ADMIN_PASSWORD", configured: Boolean(env.adminPassword), purpose: "Admin panel credential", required: false },
    { name: "ADMIN_SESSION_SECRET", configured: Boolean(env.adminSessionSecret), purpose: "Signed admin session cookie", required: false },
    { name: "OPENROUTER_API_KEY", configured: Boolean(read("OPENROUTER_API_KEY")), purpose: "AI assistant / product copy", required: false },
    { name: "OPENROUTER_API_KEY_FOR_ADMINPANEL_PRODUCT", configured: Boolean(read("OPENROUTER_API_KEY_FOR_ADMINPANEL_PRODUCT")), purpose: "Admin product AI fallback key", required: false },
    { name: "OPENROUTER_MODEL", configured: Boolean(read("OPENROUTER_MODEL")), purpose: "Default AI model", required: false },
    { name: "AI_MODELS", configured: read("AI_MODELS") !== undefined, purpose: "Selectable AI models", required: false },
    { name: "OPENROUTER_BASE_URL / AI_BASE_URL", configured: Boolean(read("OPENROUTER_BASE_URL") ?? read("AI_BASE_URL")), purpose: "AI gateway base URL", required: false },
    { name: "NEXT_PUBLIC_SITE_URL / SITE_URL", configured: read("NEXT_PUBLIC_SITE_URL") !== undefined || read("SITE_URL") !== undefined, purpose: "Canonical URLs, sitemap, metadata", required: false },
    { name: "PAYMENT_BKASH_NUMBER", configured: Boolean(read("PAYMENT_BKASH_NUMBER")), purpose: "bKash manual send-money number", required: false },
    { name: "PAYMENT_NAGAD_NUMBER", configured: Boolean(read("PAYMENT_NAGAD_NUMBER")), purpose: "Nagad manual send-money number", required: false },
    { name: "PAYMENT_ROCKET_NUMBER", configured: Boolean(read("PAYMENT_ROCKET_NUMBER")), purpose: "Rocket manual send-money number", required: false },
  ];
}

/** Throws a clear, secret-free error when a required variable is absent. */
export function requireEnv(key: "DATABASE_URL" | "ADMIN_SESSION_SECRET"): string {
  const value = key === "DATABASE_URL" ? env.databaseUrl : env.adminSessionSecret;
  if (!value) {
    throw new Error(
      `Missing required environment variable ${key}. Add it to .env (value is never logged).`,
    );
  }
  return value;
}
