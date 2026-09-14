import { db } from "@/db";
import { cache } from "react";
import { settings } from "@/db/schema";
import { STORE } from "@/lib/config";

export type StoreSettings = {
  /* ——— store & website identity (admin-editable) ——— */
  storeName: string; // brand shown in nav / footer & in the metadata template
  siteTitle: string; // browser-tab title of the home page
  siteTagline: string; // footer tagline & metadata description lead
  /* ——— delivery & advance payment ——— */
  deliveryFeeInside: number; // inside Chattogram
  deliveryFeeOutside: number; // outside Chattogram
  bkashNumber: string;
  nagadNumber: string;
  rocketNumber: string;
  /* ——— AI assistant (any OpenRouter-compatible endpoint) ——— */
  aiBaseUrl: string; // chat-completions endpoint
  aiApiKey: string; // bearer token (server-side only, never sent to the browser)
  aiModels: string; // comma-separated model fallback list
  /* ——— contact details (admin → public site; single global configuration) ——— */
  contactPhone: string;
  contactWhatsapp: string;
  contactEmail: string;
  contactSupportEmail: string;
  contactAddress: string;
  contactCity: string;
  contactCountry: string;
  contactOpeningHours: string;
  contactSupportHours: string;
  contactDescription: string;
  contactFacebook: string;
  contactInstagram: string;
  contactTiktok: string;
  contactYoutube: string;
  contactTwitter: string;
  contactPhoneEnabled: boolean;
  contactWhatsappEnabled: boolean;
  contactEmailEnabled: boolean;
  contactFacebookEnabled: boolean;
  contactInstagramEnabled: boolean;
  contactTiktokEnabled: boolean;
  contactYoutubeEnabled: boolean;
  contactTwitterEnabled: boolean;
};

export const DEFAULT_AI_BASE_URL = "https://openrouter.ai/api/v1/chat/completions";
export const DEFAULT_AI_MODELS = [
  "nvidia/nemotron-3.5-lightning:free",
  "inclusionai/ling-3.0-flash-fin:free",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
].join(", ");

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: STORE.name,
  siteTitle: `${STORE.name} — ${STORE.tagline}`,
  siteTagline: STORE.tagline,
  deliveryFeeInside: 70,
  deliveryFeeOutside: 130,
  bkashNumber: "",
  nagadNumber: "",
  rocketNumber: "",
  aiBaseUrl: process.env.AI_BASE_URL?.trim() || process.env.OPENROUTER_BASE_URL?.trim() || DEFAULT_AI_BASE_URL,
  aiApiKey: "",
  aiModels: process.env.AI_MODELS?.trim() || process.env.OPENROUTER_MODEL?.trim() || DEFAULT_AI_MODELS,
  /* ——— contact details default to empty/hidden-safe; enabled flags mirror the spec example ——— */
  contactPhone: "",
  contactWhatsapp: "",
  contactEmail: "",
  contactSupportEmail: "",
  contactAddress: "",
  contactCity: "",
  contactCountry: "",
  contactOpeningHours: "",
  contactSupportHours: "",
  contactDescription: "",
  contactFacebook: "",
  contactInstagram: "",
  contactTiktok: "",
  contactYoutube: "",
  contactTwitter: "",
  contactPhoneEnabled: true,
  contactWhatsappEnabled: true,
  contactEmailEnabled: true,
  contactFacebookEnabled: true,
  contactInstagramEnabled: true,
  contactTiktokEnabled: false,
  contactYoutubeEnabled: false,
  contactTwitterEnabled: false,
};

/** Env-var fallback for the AI settings (an admin setting always wins). */
function aiEnvFallback(key: string): string | null {
  switch (key) {
    case "aiBaseUrl":
      return process.env.AI_BASE_URL?.trim() || process.env.OPENROUTER_BASE_URL?.trim() || null;
    case "aiApiKey":
      return (
        process.env.OPENROUTER_API_KEY?.trim() ||
        process.env.OPENROUTER_API_KEY_FOR_ADMINPANEL_PRODUCT?.trim() ||
        null
      );
    case "aiModels":
      return process.env.AI_MODELS?.trim() || process.env.OPENROUTER_MODEL?.trim() || null;
    default:
      return null;
  }
}

/** Request-scoped memoized store settings — admin DB values first, env fallback, then defaults. */
export const getSettings = cache(async (): Promise<StoreSettings> => {
  try {
    const rows = await db.select().from(settings);
    const map = new Map(rows.map((r) => [r.key, r.value]));
    const num = (k: string, d: number) => {
      const v = Number(map.get(k));
      return Number.isFinite(v) && v >= 0 ? Math.floor(v) : d;
    };
    const str = (k: string, d: string) => {
      const fromDb = map.get(k);
      if (fromDb !== undefined && fromDb.trim() !== "") return fromDb;
      return aiEnvFallback(k) ?? d;
    };
    const opt = (k: string) => (map.get(k) ?? "").trim();
    const flag = (k: string, d: boolean) => {
      const v = (map.get(k) ?? "").trim().toLowerCase();
      if (v === "1" || v === "true" || v === "on") return true;
      if (v === "0" || v === "false" || v === "off") return false;
      return d;
    };
    return {
      storeName: str("storeName", DEFAULT_SETTINGS.storeName),
      siteTitle: str("siteTitle", DEFAULT_SETTINGS.siteTitle),
      // fall back to the legacy "tagline" key so previously saved admin taglines survive
      siteTagline: str("siteTagline", map.get("tagline")?.trim() || DEFAULT_SETTINGS.siteTagline),
      deliveryFeeInside: num("deliveryFeeInside", DEFAULT_SETTINGS.deliveryFeeInside),
      deliveryFeeOutside: num("deliveryFeeOutside", DEFAULT_SETTINGS.deliveryFeeOutside),
      bkashNumber: map.get("bkashNumber") ?? "",
      nagadNumber: map.get("nagadNumber") ?? "",
      rocketNumber: map.get("rocketNumber") ?? "",
      aiBaseUrl: str("aiBaseUrl", DEFAULT_SETTINGS.aiBaseUrl),
      aiApiKey: str("aiApiKey", ""),
      aiModels: str("aiModels", DEFAULT_SETTINGS.aiModels),
      contactPhone: opt("contactPhone"),
      contactWhatsapp: opt("contactWhatsapp"),
      contactEmail: opt("contactEmail"),
      contactSupportEmail: opt("contactSupportEmail"),
      contactAddress: opt("contactAddress"),
      contactCity: opt("contactCity"),
      contactCountry: opt("contactCountry"),
      contactOpeningHours: opt("contactOpeningHours"),
      contactSupportHours: opt("contactSupportHours"),
      contactDescription: opt("contactDescription"),
      contactFacebook: opt("contactFacebook"),
      contactInstagram: opt("contactInstagram"),
      contactTiktok: opt("contactTiktok"),
      contactYoutube: opt("contactYoutube"),
      contactTwitter: opt("contactTwitter"),
      contactPhoneEnabled: flag("contactPhoneEnabled", true),
      contactWhatsappEnabled: flag("contactWhatsappEnabled", true),
      contactEmailEnabled: flag("contactEmailEnabled", true),
      contactFacebookEnabled: flag("contactFacebookEnabled", true),
      contactInstagramEnabled: flag("contactInstagramEnabled", true),
      contactTiktokEnabled: flag("contactTiktokEnabled", false),
      contactYoutubeEnabled: flag("contactYoutubeEnabled", false),
      contactTwitterEnabled: flag("contactTwitterEnabled", false),
    };
  } catch {
    /* db unreachable — env vars still configure the AI assistant */
    return {
      ...DEFAULT_SETTINGS,
      aiApiKey:
        process.env.OPENROUTER_API_KEY?.trim() ||
        process.env.OPENROUTER_API_KEY_FOR_ADMINPANEL_PRODUCT?.trim() ||
        "",
    };
  }
});

/** Comma-separated admin model list → model names (defaults when empty). */
export function parseAiModels(models: string): string[] {
  const list = (models || "").split(",").map((m) => m.trim()).filter(Boolean);
  return list.length > 0 ? list : DEFAULT_AI_MODELS.split(",").map((m) => m.trim());
}

export async function saveSettings(values: Record<string, string>): Promise<void> {
  for (const [key, value] of Object.entries(values)) {
    await db
      .insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value, updatedAt: new Date() },
      });
  }
}

/** True when the city string looks like Chattogram (also matches legacy spellings). */
export function isInsideChittagong(city: string): boolean {
  return /chittagong|chattogram|chatgaon|ctg/i.test(city.trim());
}

/** Delivery charge is prepaid; product payment is cash on delivery. */
export function deliveryFeeFor(city: string, s: StoreSettings): number {
  return isInsideChittagong(city) ? s.deliveryFeeInside : s.deliveryFeeOutside;
}

/** Payment number for a method: admin setting first, then env fallback. */
export async function getPaymentNumber(method: string): Promise<string | null> {
  const s = await getSettings();
  const fromSettings =
    method === "bkash" ? s.bkashNumber : method === "nagad" ? s.nagadNumber : method === "rocket" ? s.rocketNumber : "";
  if (fromSettings.trim()) return fromSettings.trim();
  const envMap: Record<string, string | null> = {
    bkash: process.env.PAYMENT_BKASH_NUMBER || null,
    nagad: process.env.PAYMENT_NAGAD_NUMBER || null,
    rocket: process.env.PAYMENT_ROCKET_NUMBER || null,
  };
  return envMap[method] ?? null;
}
