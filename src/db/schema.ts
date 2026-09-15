import {
  pgTable,
  pgEnum,
  uuid,
  serial,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  date,
  index,
} from "drizzle-orm/pg-core";
import { isPantLike, PANT_WAIST_GROUP } from "@/lib/clothing";

/* ------------------------------------------------------------------ */
/*  Products                                                           */
/* ------------------------------------------------------------------ */

export type VariantGroup = { name: string; options: string[] };

/** One row of the per-size table (Size | SKU | Stock | Price override | Barcode). */
export type ProductSize = {
  size: string;
  sku: string;
  stock: number;
  price: number | null; // null → use the product price
  barcode: string;
};

/** One color variant. */
export type ProductColor = {
  name: string;
  hex: string;
  image: string;
  sku: string;
  stock: number;
  price: number | null;
  barcode: string;
};

/** One cell of the variant inventory matrix (Color × Size). */
export type VariantInventory = {
  color: string;
  size: string;
  sku: string;
  stock: number;
  price: number | null;
  barcode: string;
};

/** A gallery image (first entry = main image). */
export type ProductImage = { url: string; alt: string; order: number };

/** A labeled product-option selection carried on cart/order items (e.g. Waist Size → "32"). */
export type VariantAttribute = { label: string; value: string };

export const PRODUCT_STATUSES = ["draft", "active", "archived"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];
export const PRODUCT_VISIBILITIES = ["online", "hidden"] as const;
export type ProductVisibility = (typeof PRODUCT_VISIBILITIES)[number];

export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 160 }).notNull().unique(),
    name: varchar("name", { length: 160 }).notNull(),
    description: text("description").notNull().default(""),
    material: text("material").notNull().default(""),
    price: integer("price").notNull(), // in BDT
    compareAtPrice: integer("compare_at_price"),
    image: varchar("image", { length: 300 }).notNull(),
    isFeatured: boolean("is_featured").notNull().default(false),
    isNew: boolean("is_new").notNull().default(false),
    stock: integer("stock").notNull().default(25),
    variants: jsonb("variants").$type<VariantGroup[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    /* ——— clothing product management (2026-09 upgrade, defaults keep existing rows valid) ——— */
    sku: varchar("sku", { length: 64 }).notNull().default(""),
    barcode: varchar("barcode", { length: 64 }).notNull().default(""),
    brand: varchar("brand", { length: 80 }).notNull().default(""),
    category: varchar("category", { length: 60 }).notNull().default(""),
    subcategory: varchar("subcategory", { length: 60 }).notNull().default(""),
    collection: varchar("collection", { length: 80 }).notNull().default(""),
    productType: varchar("product_type", { length: 60 }).notNull().default(""),
    shortDescription: text("short_description").notNull().default(""),
    costPrice: integer("cost_price"),
    taxPct: integer("tax_pct").notNull().default(0),
    currency: varchar("currency", { length: 8 }).notNull().default("BDT"),
    gender: varchar("gender", { length: 12 }).notNull().default(""),
    clothingType: varchar("clothing_type", { length: 40 }).notNull().default(""),
    fabric: varchar("fabric", { length: 40 }).notNull().default(""),
    fabricWeight: varchar("fabric_weight", { length: 30 }).notNull().default(""),
    fit: varchar("fit", { length: 20 }).notNull().default(""),
    pattern: varchar("pattern", { length: 20 }).notNull().default(""),
    season: varchar("season", { length: 20 }).notNull().default(""),
    countryOfOrigin: varchar("country_of_origin", { length: 60 }).notNull().default(""),
    sizes: jsonb("sizes").$type<ProductSize[]>().notNull().default([]),
    colors: jsonb("colors").$type<ProductColor[]>().notNull().default([]),
    variantInventory: jsonb("variant_inventory")
      .$type<VariantInventory[]>()
      .notNull()
      .default([]),
    images: jsonb("images").$type<ProductImage[]>().notNull().default([]),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    isBestSeller: boolean("is_best_seller").notNull().default(false),
    isOnSale: boolean("is_on_sale").notNull().default(false),
    status: varchar("status", { length: 12 }).$type<ProductStatus>().notNull().default("active"),
    visibility: varchar("visibility", { length: 12 })
      .$type<ProductVisibility>()
      .notNull()
      .default("online"),
    trackInventory: boolean("track_inventory").notNull().default(true),
    allowBackorders: boolean("allow_backorders").notNull().default(false),
    lowStockThreshold: integer("low_stock_threshold").notNull().default(5),
    weightGrams: integer("weight_grams"),
    packageWeightGrams: integer("package_weight_grams"),
    lengthCm: integer("length_cm"),
    widthCm: integer("width_cm"),
    heightCm: integer("height_cm"),
    freeShipping: boolean("free_shipping").notNull().default(false),
    sizeRecommendationEnabled: boolean("size_recommendation_enabled").notNull().default(false),
    shippingClass: varchar("shipping_class", { length: 30 }).notNull().default(""),
    seoTitle: varchar("seo_title", { length: 160 }).notNull().default(""),
    seoDescription: text("seo_description").notNull().default(""),
    seoKeywords: varchar("seo_keywords", { length: 300 }).notNull().default(""),
    canonicalUrl: varchar("canonical_url", { length: 300 }).notNull().default(""),
    seoImage: varchar("seo_image", { length: 300 }).notNull().default(""),

    /* ——— rich content blocks (2026-09: admin → storefront sync) ——— */
    features: jsonb("features").$type<string[]>().notNull().default([]),
    specifications: jsonb("specifications").$type<{ label: string; value: string }[]>().notNull().default([]),
    warranty: text("warranty").notNull().default(""),
    returnPolicy: text("return_policy").notNull().default(""),
    deliveryInfo: text("delivery_info").notNull().default(""),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("products_status_idx").on(t.status),
    index("products_category_idx").on(t.category),
    index("products_brand_idx").on(t.brand),
  ],
);

export type Product = typeof products.$inferSelect;

/* ——— derived helpers shared by admin + storefront ——— */

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export function totalStockOf(p: {
  stock: number;
  variantInventory?: VariantInventory[];
  sizes?: ProductSize[];
}): number {
  if (p.variantInventory && p.variantInventory.length > 0) {
    return p.variantInventory.reduce((sum, v) => sum + Math.max(0, v.stock || 0), 0);
  }
  if (p.sizes && p.sizes.length > 0) {
    return p.sizes.reduce((sum, s) => sum + Math.max(0, s.stock || 0), 0);
  }
  return Math.max(0, p.stock || 0);
}

export function stockStatusOf(
  p: { stock: number; variantInventory?: VariantInventory[]; sizes?: ProductSize[]; lowStockThreshold: number },
): StockStatus {
  const total = totalStockOf(p);
  if (total <= 0) return "out_of_stock";
  if (total <= p.lowStockThreshold) return "low_stock";
  return "in_stock";
}

/**
 * Map the clothing size/color system onto the legacy `VariantGroup[]` shape
 * that the storefront PurchasePanel already consumes — existing products with
 * hand-made variant groups are returned untouched.
 */
export function effectiveVariants(p: {
  variants: VariantGroup[];
  sizes?: ProductSize[];
  colors?: ProductColor[];
  variantInventory?: VariantInventory[];
  clothingType?: string;
  category?: string;
  productType?: string;
}): VariantGroup[] {
  /* Pant/trouser products use dedicated waist-size + leg-opening groups from the
     hand-made `variants` column, even when per-waist stock lives in `sizes`. */
  if (isPantLike(p)) {
    if (p.variants && p.variants.length > 0) return p.variants;
    const waist = (p.sizes ?? []).map((s) => s.size).filter(Boolean);
    return waist.length ? [{ name: PANT_WAIST_GROUP, options: waist }] : [];
  }
  const sizes = (p.sizes ?? []).map((s) => s.size);
  const inv = p.variantInventory ?? [];
  const colorsInInv = Array.from(new Set(inv.map((v) => v.color)));
  const sizesInInv = Array.from(new Set(inv.map((v) => v.size)));

  if (inv.length > 0 && colorsInInv.length > 0 && sizesInInv.length > 0) {
    return [
      { name: "Color", options: colorsInInv },
      { name: "Size", options: sizesInInv },
    ];
  }
  if (inv.length > 0 && colorsInInv.length > 0) {
    return [{ name: "Color", options: colorsInInv }];
  }
  if (sizes.length > 0) {
    return [{ name: "Size", options: sizes }];
  }
  if ((p.colors ?? []).length > 0) {
    return [{ name: "Color", options: p.colors!.map((c) => c.name) }];
  }
  return p.variants ?? [];
}

/* ------------------------------------------------------------------ */
/*  Product reviews                                                    */
/* ------------------------------------------------------------------ */

export const productReviews = pgTable(
  "product_reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    userId: uuid("user_id"),
    name: varchar("name", { length: 120 }).notNull(),
    rating: integer("rating").notNull(), // 1–5
    review: text("review").notNull(),
    email: varchar("email", { length: 160 }),
    phone: varchar("phone", { length: 24 }),
    verifiedPurchase: boolean("verified_purchase").notNull().default(false),
    approved: boolean("approved").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("product_reviews_product_idx").on(t.productId), index("product_reviews_user_idx").on(t.userId)],
);

export type ProductReview = typeof productReviews.$inferSelect;
export type NewProductReview = typeof productReviews.$inferInsert;

/* ------------------------------------------------------------------ */
/*  Orders                                                             */
/* ------------------------------------------------------------------ */

export const ORDER_STAGES = [
  "pending_payment",
  "payment_verified",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
] as const;

export type OrderStage = (typeof ORDER_STAGES)[number];

/** How the order is paid: delivery charge prepaid + product COD, or everything prepaid. */
export const PAYMENT_PURPOSES = ["delivery_charge", "full_order"] as const;
export type PaymentPurpose = (typeof PAYMENT_PURPOSES)[number];

export const orderStatusEnum = pgEnum("order_status", [
  "pending_payment",
  "payment_verified",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
]);

export type OrderItem = {
  productId: string;
  slug: string;
  name: string;
  image: string;
  variant: string;
  price: number;
  qty: number;
  /** Optional, labeled options (e.g. Waist Size / Leg Opening) for pant/trouser items. */
  attributes?: VariantAttribute[];
};

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderNumber: varchar("order_number", { length: 24 }).notNull().unique(),
    userId: uuid("user_id"),
    customerName: varchar("customer_name", { length: 120 }).notNull(),
    phone: varchar("phone", { length: 20 }).notNull(),
    email: varchar("email", { length: 160 }),
    address: text("address").notNull(),
    city: varchar("city", { length: 80 }).notNull(),
    notes: text("notes"),
    paymentMethod: varchar("payment_method", { length: 20 }).notNull(), // bkash | nagad | rocket
    senderNumber: varchar("sender_number", { length: 20 }),
    transactionId: varchar("transaction_id", { length: 60 }),
    subtotal: integer("subtotal").notNull(),
    shippingFee: integer("shipping_fee").notNull(),
    total: integer("total").notNull(),
    /* ——— pricing breakdown (all server-computed) ——— */
    discount: integer("discount").notNull().default(0),
    couponCode: varchar("coupon_code", { length: 40 }),
    /* ——— delivery classification ——— */
    deliveryZone: varchar("delivery_zone", { length: 20 }).notNull().default("outside_ctg"), // inside_ctg | outside_ctg
    /* ——— payment plan ——— */
    paymentPurpose: varchar("payment_purpose", { length: 20 })
      .notNull()
      .default("delivery_charge"), // delivery_charge (product COD) | full_order
    amountPaid: integer("amount_paid").notNull().default(0), // prepaid now (verified)
    codAmount: integer("cod_amount").notNull().default(0), // collect on delivery
    deliveryPaymentStatus: varchar("delivery_payment_status", { length: 12 })
      .notNull()
      .default("unpaid"), // unpaid | paid
    productPaymentStatus: varchar("product_payment_status", { length: 12 })
      .notNull()
      .default("cod"), // cod | unpaid | paid
    /* ——— idempotency ——— */
    clientRequestId: varchar("client_request_id", { length: 64 }).unique(),
    items: jsonb("items").$type<OrderItem[]>().notNull(),
    status: orderStatusEnum("status").notNull().default("pending_payment"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("orders_phone_idx").on(t.phone), index("orders_created_idx").on(t.createdAt), index("orders_user_idx").on(t.userId)],
);

export type Order = typeof orders.$inferSelect;

/* ------------------------------------------------------------------ */
/*  Customer profile system (RLS-protected, user_id = auth.uid())      */
/* ------------------------------------------------------------------ */

export const customerProfiles = pgTable("customer_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().unique(),
  fullName: varchar("full_name", { length: 120 }).notNull().default(""),
  email: varchar("email", { length: 160 }).notNull().default(""),
  phone: varchar("phone", { length: 24 }).notNull().default(""),
  profilePhoto: text("profile_photo").notNull().default(""),
  dateOfBirth: date("date_of_birth"),
  gender: varchar("gender", { length: 16 }),
  accountStatus: varchar("account_status", { length: 20 }).notNull().default("active"),
  notificationPrefs: jsonb("notification_prefs")
    .$type<{ orderUpdates: boolean; promotions: boolean; email: boolean }>()
    .notNull()
    .default({ orderUpdates: true, promotions: true, email: true }),
  profileVisibility: varchar("profile_visibility", { length: 16 }).notNull().default("private"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CustomerProfile = typeof customerProfiles.$inferSelect;

export const customerAddresses = pgTable("customer_addresses", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  fullName: varchar("full_name", { length: 120 }).notNull(),
  phone: varchar("phone", { length: 24 }).notNull(),
  division: varchar("division", { length: 60 }).notNull().default(""),
  district: varchar("district", { length: 60 }).notNull().default(""),
  upazila: varchar("upazila", { length: 60 }).notNull().default(""),
  address: text("address").notNull(),
  postalCode: varchar("postal_code", { length: 12 }).notNull().default(""),
  label: varchar("label", { length: 12 }).notNull().default("home"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CustomerAddress = typeof customerAddresses.$inferSelect;

export const wishlists = pgTable("wishlists", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  productId: uuid("product_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type WishlistRow = typeof wishlists.$inferSelect;

export const customerNotifications = pgTable("customer_notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  message: text("message").notNull().default(""),
  type: varchar("type", { length: 24 }).notNull().default("general"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CustomerNotification = typeof customerNotifications.$inferSelect;

/* ------------------------------------------------------------------ */
/*  Coupons                                                            */
/* ------------------------------------------------------------------ */

export type CouponDiscountType = "percent" | "fixed";

export const coupons = pgTable(
  "coupons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 40 }).notNull().unique(), // uppercase, unique
    discountType: varchar("discount_type", { length: 10 }).notNull().default("percent"), // percent | fixed
    discountValue: integer("discount_value").notNull(), // percent (1-100) or fixed BDT
    minOrderAmount: integer("min_order_amount").notNull().default(0),
    maxDiscountAmount: integer("max_discount_amount"), // cap for percent coupons
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
    usageLimit: integer("usage_limit"), // total redemptions allowed
    perUserLimit: integer("per_user_limit"), // per phone number
    usedCount: integer("used_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export type Coupon = typeof coupons.$inferSelect;

/** One redemption row per order that used a coupon. */
export const couponRedemptions = pgTable(
  "coupon_redemptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    couponId: uuid("coupon_id")
      .notNull()
      .references(() => coupons.id, { onDelete: "cascade" }),
    orderNumber: varchar("order_number", { length: 24 }).notNull(),
    phone: varchar("phone", { length: 20 }).notNull(),
    discountAmount: integer("discount_amount").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("coupon_redemptions_coupon_idx").on(t.couponId), index("coupon_redemptions_phone_idx").on(t.phone)],
);

/* ------------------------------------------------------------------ */
/*  Newsletter                                                         */
/* ------------------------------------------------------------------ */

export const subscribers = pgTable("subscribers", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 160 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ------------------------------------------------------------------ */
/*  Contact messages                                                   */
/* ------------------------------------------------------------------ */

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 160 }).notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ------------------------------------------------------------------ */
/*  Store settings (admin-editable key/value overrides)                */
/* ------------------------------------------------------------------ */

export const CAMPAIGN_TYPES = [
  "percentage",
  "flat",
  "flash_sale",
  "limited_time",
  "new_arrival",
  "free_delivery",
  "coupon",
  "special",
  "custom",
] as const;

export type CampaignType = (typeof CAMPAIGN_TYPES)[number];

export const CAMPAIGN_PLACEMENTS = [
  "announcement",
  "home_top",
  "below_hero",
  "above_products",
  "between_sections",
  "product_page",
  "category_page",
] as const;

export type CampaignPlacement = (typeof CAMPAIGN_PLACEMENTS)[number];

export const DISCOUNT_KINDS = ["none", "percentage", "fixed"] as const;
export type DiscountKind = (typeof DISCOUNT_KINDS)[number];

/**
 * Dynamic promotional campaigns — managed entirely from the Admin Panel.
 * All scheduled times are absolute UTC instants; Dhaka (Asia/Dhaka) is only
 * ever used for display and admin datetime-local entry, never for storage.
 */
export const promoCampaigns = pgTable(
  "promo_campaigns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    campaignName: varchar("campaign_name", { length: 120 }).notNull(),
    label: varchar("label", { length: 60 }).notNull().default(""),
    heading: varchar("heading", { length: 120 }).notNull().default(""),
    description: varchar("description", { length: 300 }).notNull().default(""),
    campaignType: varchar("campaign_type", { length: 20 }).notNull().default("custom"),
    discountKind: varchar("discount_kind", { length: 12 }).notNull().default("none"),
    discountValue: integer("discount_value").notNull().default(0),
    couponCode: varchar("coupon_code", { length: 40 }).notNull().default(""),
    ctaText: varchar("cta_text", { length: 60 }).notNull().default(""),
    ctaUrl: varchar("cta_url", { length: 300 }).notNull().default(""),
    /* ——— design ——— */
    bgMode: varchar("bg_mode", { length: 10 }).notNull().default("solid"), // solid | gradient | image
    bgColor: varchar("bg_color", { length: 9 }).notNull().default("#0b263d"),
    bgColor2: varchar("bg_color2", { length: 9 }).notNull().default("#4da8ff"),
    textColor: varchar("text_color", { length: 9 }).notNull().default("#f4faff"),
    accentColor: varchar("accent_color", { length: 9 }).notNull().default("#8ccbff"),
    buttonColor: varchar("button_color", { length: 9 }).notNull().default("#ddf3ff"),
    buttonTextColor: varchar("button_text_color", { length: 9 }).notNull().default("#06131f"),
    radius: integer("radius").notNull().default(20), // px
    height: varchar("height", { length: 8 }).notNull().default("md"), // sm | md | lg
    layout: varchar("layout", { length: 10 }).notNull().default("center"), // center | split
    align: varchar("align", { length: 6 }).notNull().default("left"), // left | center | right
    gradientEnabled: boolean("gradient_enabled").notNull().default(true),
    animationEnabled: boolean("animation_enabled").notNull().default(true),
    imageUrl: varchar("image_url", { length: 300 }).notNull().default(""),
    mobileImageUrl: varchar("mobile_image_url", { length: 300 }).notNull().default(""),
    /* ——— targeting / schedule / ordering ——— */
    placement: varchar("placement", { length: 20 }).notNull().default("below_hero"),
    targetType: varchar("target_type", { length: 12 }).notNull().default("all"), // all | product | category | collection
    targetId: varchar("target_id", { length: 200 }).notNull().default(""),
    startAt: timestamp("start_at", { withTimezone: true }),
    endAt: timestamp("end_at", { withTimezone: true }),
    priority: integer("priority").notNull().default(5),
    sortOrder: integer("sort_order").notNull().default(0),
    isEnabled: boolean("is_enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("promo_campaigns_active_idx").on(t.isEnabled, t.placement, t.priority, t.sortOrder),
    index("promo_campaigns_window_idx").on(t.startAt, t.endAt),
  ],
);

export type PromoCampaign = typeof promoCampaigns.$inferSelect;
export type NewPromoCampaign = typeof promoCampaigns.$inferInsert;

export const settings = pgTable("settings", {
  key: varchar("key", { length: 60 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ------------------------------------------------------------------ */
/*  Hero videos ("NEW ARRIVALS" card in the homepage hero)             */
/* ------------------------------------------------------------------ */

export const heroVideos = pgTable(
  "hero_videos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    videoUrl: varchar("video_url", { length: 500 }).notNull(),
    thumbnailUrl: varchar("thumbnail_url", { length: 500 }).notNull().default(""),
    label: varchar("label", { length: 80 }).notNull().default("NEW ARRIVALS"),
    title: varchar("title", { length: 160 }).notNull(),
    subtitle: varchar("subtitle", { length: 300 }).notNull().default(""),
    bottomText: varchar("bottom_text", { length: 120 }).notNull().default(""),
    durationLabel: varchar("duration_label", { length: 20 }).notNull().default(""),
    displayOrder: integer("display_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("hero_videos_order_idx").on(t.displayOrder)],
);

export type HeroVideo = typeof heroVideos.$inferSelect;

/* ------------------------------------------------------------------ */
/*  About page media (story picture / video on /about)                  */
/* ------------------------------------------------------------------ */

export const aboutMedia = pgTable("about_media", {
  id: uuid("id").defaultRandom().primaryKey(),
  url: varchar("url", { length: 500 }).notNull(),
  /* "image" | "video" */
  kind: varchar("kind", { length: 10 }).notNull().default("image"),
  alt: varchar("alt", { length: 200 }).notNull().default(""),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AboutMedia = typeof aboutMedia.$inferSelect;
