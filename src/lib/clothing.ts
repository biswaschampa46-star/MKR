/** Shared clothing option lists — used by the admin product form and server-side validation. */

export const GENDERS = ["Men", "Women", "Unisex", "Kids"] as const;
export const CLOTHING_TYPES = [
  "T-Shirt", "Shirt", "Polo", "Panjabi", "Kurta", "Hoodie", "Sweatshirt",
  "Jacket", "Jeans", "Pants", "Shorts", "Saree", "Salwar Kameez", "Dress",
  "Skirt", "Other",
] as const;
export const FABRICS = [
  "Cotton", "Polyester", "Linen", "Denim", "Silk", "Wool", "Rayon",
  "Cotton Blend", "Other",
] as const;
export const FITS = ["Slim", "Regular", "Relaxed", "Oversized"] as const;
export const PATTERNS = ["Solid", "Printed", "Striped", "Checked", "Embroidered", "Graphic", "Other"] as const;
export const SEASONS = ["Summer", "Winter", "Monsoon", "All Season"] as const;
export const STANDARD_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "Free Size"] as const;

/* ——— pant / trouser sizing ——— */
export const PANT_LIKE_TYPES = ["Jeans", "Pants", "Shorts"] as const;
export const PANT_WAIST_GROUP = "Waist Size";
export const PANT_LEG_GROUP = "Leg Opening";
export const PANT_LENGTH_GROUP = "Length";
/* UI convenience presets — admins are free to add/remove/edit any value; nothing is hard-coded as a requirement. */
export const DEFAULT_WAIST_SIZES = ["28", "29", "30", "31", "32", "33", "34", "35", "36"];
export const DEFAULT_LEG_OPENINGS = ['15"', '16"', '17"', '18"', '19"', '20"', '21"', '22"'];

/** True when the product uses numeric pant sizing (waist + leg opening) instead of S/M/L. */
export function isPantLike(p: { clothingType?: string; category?: string; productType?: string }): boolean {
  const ct = (p.clothingType ?? "").trim().toLowerCase();
  if (PANT_LIKE_TYPES.some((t) => t.toLowerCase() === ct)) return true;
  const hay = `${p.category ?? ""} ${p.productType ?? ""}`.toLowerCase();
  return /pant|jean|trouser/.test(hay);
}
export const CATEGORIES = [
  "T-Shirts", "Shirts", "Panjabi & Kurta", "Hoodies & Sweatshirts", "Jackets",
  "Pants & Jeans", "Saree", "Salwar Kameez", "Dresses & Skirts", "Accessories", "Other",
] as const;
export const PRODUCT_STATUSES_UI = ["draft", "active", "archived"] as const;
export type ProductStatusUi = (typeof PRODUCT_STATUSES_UI)[number];

export function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 150);
}

/** Suggest a base SKU from the product name, e.g. "Oversized Tee" → "OVT". */
export function suggestSku(name: string): string {
  const words = name.trim().toUpperCase().replace(/[^A-Z0-9\s]/g, "").split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  return words.map((w) => w.slice(0, 3)).slice(0, 2).join("-").slice(0, 20);
}

export function discountPctOf(price: number, compareAt: number | null): number | null {
  if (!compareAt || compareAt <= price || price < 0) return null;
  return Math.round(((compareAt - price) / compareAt) * 100);
}