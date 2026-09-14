/**
 * Server-side validation + sanitization for the product payload.
 * The client may send extra/unknown fields — everything that is persisted
 * passes through here first. Never trust the browser.
 */
import {
  GENDERS, CLOTHING_TYPES, FABRICS, FITS, PATTERNS, SEASONS, slugifyName,
  isPantLike, PANT_LEG_GROUP,
} from "@/lib/clothing";
import type {
  ProductSize, ProductColor, VariantInventory, ProductImage, ProductStatus, ProductVisibility,
} from "@/db/schema";

export type ProductPayload = Partial<Record<string, unknown>>;

const str = (v: unknown, max: number): string =>
  typeof v === "string" ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max) : "";
const optInt = (v: unknown): number | null => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n >= 0 && n <= 10_000_000 ? n : null;
};
const bool = (v: unknown): boolean => v === true || v === "true";

export type ValidationResult =
  | { ok: true; data: ReturnType<typeof buildProductValues> }
  | { ok: false; message: string };

export type ProductSaveOptions = { requireImage: boolean };

export function validateProduct(body: ProductPayload, opts: ProductSaveOptions): ValidationResult {
  const name = str(body.name, 160);
  if (name.length < 2) return { ok: false, message: "Product name is required (at least 2 characters)." };

  const price = Math.floor(Number(body.price));
  if (!Number.isFinite(price) || price <= 0)
    return { ok: false, message: "A valid selling price is required." };

  const image = str(body.image, 300);
  if (opts.requireImage && !image)
    return { ok: false, message: "At least one product image is required before publishing." };

  const compareAt = optInt(body.compareAtPrice);
  if (compareAt !== null && compareAt <= price)
    return { ok: false, message: "Compare-at price must be higher than the selling price." };

  const sku = str(body.sku, 64);
  if (opts.requireImage && !sku)
    return { ok: false, message: "SKU is required before publishing." };

  const category = str(body.category, 60);
  if (opts.requireImage && !category)
    return { ok: false, message: "Category is required before publishing." };

  const sizes = sanitizeSizes(body.sizes);
  const colors = sanitizeColors(body.colors);
  const inv = sanitizeInventory(body.variantInventory);

  const seenSku = new Set<string>([sku]);
  for (const row of [...sizes, ...colors, ...inv]) {
    if (row.sku) {
      if (seenSku.has(row.sku))
        return { ok: false, message: `Duplicate SKU "${row.sku}" — every variant needs a unique SKU.` };
      seenSku.add(row.sku);
    }
    if (row.stock < 0)
      return { ok: false, message: "Stock cannot be negative for a variant." };
  }

  /* ——— pant/trouser validation: numeric waist sizes (no S/M/L), unique + valid,
         non-empty, unique leg openings ——— */
  if (isPantLike({ clothingType: str(body.clothingType, 40), category, productType: str(body.productType, 60) })) {
    const seenWaist = new Set<string>();
    for (const s of sizes) {
      const n = Number(s.size);
      if (!Number.isInteger(n) || n < 22 || n > 50)
        return { ok: false, message: "Pant waist sizes must be whole numbers between 22 and 50." };
      const key = s.size.toLowerCase();
      if (seenWaist.has(key))
        return { ok: false, message: `Duplicate waist size "${s.size}" — remove the repeat.` };
      seenWaist.add(key);
    }
    const legOpts: string[] = [];
    if (Array.isArray(body.variants)) {
      for (const g of body.variants as { name?: unknown; options?: unknown }[]) {
        if (typeof g?.name === "string" && g.name.trim() === PANT_LEG_GROUP && Array.isArray(g.options)) {
          for (const o of g.options) {
            const t = String(o).trim();
            if (t) legOpts.push(t.toLowerCase());
          }
        }
      }
    }
    const seenLeg = new Set<string>();
    for (const o of legOpts) {
      if (seenLeg.has(o))
        return { ok: false, message: "Leg openings must be unique." };
      seenLeg.add(o);
    }
  }

  const data = buildProductValues(body, {
    name, price, image, sku, category, compareAt, sizes, colors, inv,
  });
  return { ok: true, data };
}

function sanitizeSizes(raw: unknown): ProductSize[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, 40)
    .map((s) => {
      const row = (s ?? {}) as Record<string, unknown>;
      return {
        size: str(row.size, 20),
        sku: str(row.sku, 64),
        stock: Math.max(0, Math.floor(Number(row.stock)) || 0),
        price: optInt(row.price),
        barcode: str(row.barcode, 64),
      };
    })
    .filter((s) => s.size);
}

function sanitizeColors(raw: unknown): ProductColor[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, 30)
    .map((c) => {
      const row = (c ?? {}) as Record<string, unknown>;
      return {
        name: str(row.name, 40),
        hex: str(row.hex, 9),
        image: str(row.image, 300),
        sku: str(row.sku, 64),
        stock: Math.max(0, Math.floor(Number(row.stock)) || 0),
        price: optInt(row.price),
        barcode: str(row.barcode, 64),
      };
    })
    .filter((c) => c.name);
}

function sanitizeInventory(raw: unknown): VariantInventory[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, 600)
    .map((v) => {
      const row = (v ?? {}) as Record<string, unknown>;
      return {
        color: str(row.color, 40),
        size: str(row.size, 20),
        sku: str(row.sku, 64),
        stock: Math.max(0, Math.floor(Number(row.stock)) || 0),
        price: optInt(row.price),
        barcode: str(row.barcode, 64),
      };
    })
    .filter((v) => v.color && v.size);
}

function sanitizeImages(raw: unknown, mainImage: string): ProductImage[] {
  if (!Array.isArray(raw)) return mainImage ? [{ url: mainImage, alt: "", order: 0 }] : [];
  const imgs = raw
    .slice(0, 20)
    .map((im, i) => {
      const row = (im ?? {}) as Record<string, unknown>;
      return { url: str(row.url, 300), alt: str(row.alt, 120), order: Math.max(0, Math.floor(Number(row.order)) || i) };
    })
    .filter((im) => im.url);
  if (mainImage && !imgs.some((im) => im.url === mainImage)) {
    imgs.unshift({ url: mainImage, alt: "", order: 0 });
  }
  return imgs.map((im, i) => ({ ...im, order: i }));
}

/** Feature bullet points — free-text lines, capped. */
function sanitizeFeatures(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, 30)
    .map((f) => str(f, 300))
    .filter(Boolean);
}

/** Specification table rows — label/value pairs, capped. */
function sanitizeSpecifications(raw: unknown): { label: string; value: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, 60)
    .map((s) => {
      const row = (s ?? {}) as Record<string, unknown>;
      return { label: str(row.label, 100), value: str(row.value, 500) };
    })
    .filter((s) => s.label && s.value);
}

const enumFromList = (raw: unknown, allowed: readonly string[]): string => {
  const v = str(raw, 40);
  return (allowed as readonly string[]).includes(v) ? v : "";
};

const oneOf = (raw: unknown, allowed: readonly string[], fallback: string): string => {
  const v = str(raw, 20).toLowerCase();
  return allowed.includes(v) ? v : fallback;
};

function buildProductValues(
  body: ProductPayload,
  core: {
    name: string; price: number; image: string; sku: string; category: string;
    compareAt: number | null; sizes: ProductSize[]; colors: ProductColor[]; inv: VariantInventory[];
  },
) {
  return {
    name: core.name,
    slug: str(body.slug, 160) || slugifyName(core.name),
    description: str(body.description, 20000),
    material: str(body.material, 4000),
    price: core.price,
    compareAtPrice: core.compareAt,
    image: core.image,
    stock: Math.max(0, Math.floor(Number(body.stock)) || 0),
    isNew: bool(body.isNew),
    isFeatured: bool(body.isFeatured),
    variants: Array.isArray(body.variants)
      ? (body.variants as { name?: unknown; options?: unknown }[])
          .filter((g) => typeof g?.name === "string" && (g.name as string).trim())
          .map((g) => ({
            name: (g.name as string).trim().slice(0, 60),
            options: (Array.isArray(g.options) ? g.options : [])
              .map((o) => String(o).trim().slice(0, 60))
              .filter(Boolean),
          }))
          .slice(0, 6)
      : [],
    sku: core.sku,
    barcode: str(body.barcode, 64),
    brand: str(body.brand, 80),
    category: core.category,
    subcategory: str(body.subcategory, 60),
    collection: str(body.collection, 80),
    productType: str(body.productType, 60),
    shortDescription: str(body.shortDescription, 500),
    costPrice: optInt(body.costPrice),
    taxPct: Math.min(100, Math.max(0, optInt(body.taxPct) ?? 0)),
    currency: str(body.currency, 8) || "BDT",
    gender: enumFromList(body.gender, GENDERS),
    clothingType: enumFromList(body.clothingType, CLOTHING_TYPES),
    fabric: enumFromList(body.fabric, FABRICS),
    fabricWeight: str(body.fabricWeight, 30),
    fit: enumFromList(body.fit, FITS),
    pattern: enumFromList(body.pattern, PATTERNS),
    season: enumFromList(body.season, SEASONS),
    countryOfOrigin: str(body.countryOfOrigin, 60),
    sizes: core.sizes,
    colors: core.colors,
    variantInventory: core.inv,
    images: sanitizeImages(body.images, core.image),
    tags: Array.isArray(body.tags)
      ? (body.tags as unknown[]).map((t) => str(t, 30)).filter(Boolean).slice(0, 20)
      : [],
    isBestSeller: bool(body.isBestSeller),
    sizeRecommendationEnabled: bool(body.sizeRecommendationEnabled),
    isOnSale: bool(body.isOnSale),
    status: oneOf(body.status, ["draft", "active", "archived"], "draft") as ProductStatus,
    visibility: oneOf(body.visibility, ["online", "hidden"], "online") as ProductVisibility,
    trackInventory: body.trackInventory === undefined ? true : bool(body.trackInventory),
    allowBackorders: bool(body.allowBackorders),
    lowStockThreshold: Math.max(0, optInt(body.lowStockThreshold) ?? 5),
    weightGrams: optInt(body.weightGrams),
    packageWeightGrams: optInt(body.packageWeightGrams),
    lengthCm: optInt(body.lengthCm),
    widthCm: optInt(body.widthCm),
    heightCm: optInt(body.heightCm),
    freeShipping: bool(body.freeShipping),
    shippingClass: str(body.shippingClass, 30),
    seoTitle: str(body.seoTitle, 160),
    seoDescription: str(body.seoDescription, 500),
    seoKeywords: str(body.seoKeywords, 300),
    canonicalUrl: str(body.canonicalUrl, 300),
    seoImage: str(body.seoImage, 300),
    features: sanitizeFeatures(body.features),
    specifications: sanitizeSpecifications(body.specifications),
    warranty: str(body.warranty, 2000),
    returnPolicy: str(body.returnPolicy, 2000),
    deliveryInfo: str(body.deliveryInfo, 2000),
    updatedAt: new Date(),
  };
}