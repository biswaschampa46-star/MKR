/**
 * Client-safe contact helpers — no server/database imports.
 * Safe to import from "use client" components (admin form, nav).
 */

export type SocialKey =
  | "facebook"
  | "instagram"
  | "tiktok"
  | "youtube"
  | "twitter";

export const SOCIAL_LABELS: Record<SocialKey, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  twitter: "X (Twitter)",
};

/** Public-safe contact snapshot — only enabled, non-empty values. */
export type PublicContact = {
  storeName: string;
  description: string;
  phone: string | null;
  whatsapp: string | null;
  whatsappHref: string | null;
  email: string | null;
  supportEmail: string | null;
  address: string | null; // composed "address, city, country"
  city: string | null;
  country: string | null;
  openingHours: string | null;
  supportHours: string | null;
  socials: { key: SocialKey; label: string; href: string }[];
};

/** tel: link keeps + and digits only for dialling safety. */
export function telHref(phone: string): string {
  const cleaned = phone.trim().replace(/[^+\d]/g, "");
  return `tel:${cleaned || phone.trim()}`;
}

/** WhatsApp click-to-chat link from any human-typed number. */
export function whatsappHref(number: string): string {
  const digits = number.replace(/\D/g, "");
  return `https://wa.me/${digits}`;
}

export function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
}

export function isValidPhone(v: string): boolean {
  const digits = v.replace(/\D/g, "");
  return digits.length >= 6 && digits.length <= 16 && /^[+\d][\d\s\-()]*$/.test(v.trim());
}

export function isValidUrl(v: string): boolean {
  try {
    const u = new URL(v.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
