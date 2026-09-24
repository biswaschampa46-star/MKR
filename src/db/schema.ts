/**
 * MKR — Casual Threads & Style
 * Canonical schema. Runs on Supabase PostgreSQL (or any Postgres 13+).
 * All money values are stored as integer BDT (taka) to avoid float drift.
 */
import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  bigserial,
  date,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const bytea = customType<{ data: Buffer; notNull: false; default: false }>({
  dataType() {
    return "bytea";
  },
});

const now = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

/* ------------------------------- enums ------------------------------- */
export const productStatusEnum = pgEnum("product_status", ["draft", "active", "archived"]);
export const productVisibilityEnum = pgEnum("product_visibility", ["public", "hidden"]);
export const mediaKindEnum = pgEnum("media_kind", ["image", "video", "document"]);
export const mediaRoleEnum = pgEnum("media_role", [
  "main",
  "gallery",
  "variant",
  "size_chart",
  "promo",
  "hero",
  "about",
  "banner",
  "avatar",
]);
export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "unpaid",
  "awaiting_verification",
  "verified",
  "failed",
  "refunded",
]);
export const paymentMethodEnum = pgEnum("payment_method", ["cod", "bkash", "nagad", "rocket"]);
export const paymentPurposeEnum = pgEnum("payment_purpose", ["delivery_prepaid", "full_prepaid"]);
export const couponTypeEnum = pgEnum("coupon_type", ["percentage", "fixed"]);
export const reviewStatusEnum = pgEnum("review_status", ["pending", "approved", "rejected"]);
export const messageStatusEnum = pgEnum("message_status", ["new", "read", "archived"]);
export const authProviderEnum = pgEnum("auth_provider", ["email", "google"]);
export const cartStatusEnum = pgEnum("cart_status", ["open", "converted", "abandoned"]);
export const customerStatusEnum = pgEnum("customer_status", ["active", "blocked"]);

/* ------------------------------ settings ----------------------------- */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  /** jsonb value so each namespace (delivery, payments, contact, marketing) stays flexible */
  value: jsonb("value").notNull(),
  description: text("description"),
  updatedAt: updatedAt(),
});

/* ---------------------------- categories ----------------------------- */
export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    imageMediaId: uuid("image_media_id"),
    parentId: uuid("parent_id"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("categories_slug_key").on(t.slug), index("categories_sort_idx").on(t.sortOrder)],
);

/* ------------------------------ media ------------------------------- */
/**
 * Single source of truth for every uploaded asset.
 * `bytes` is only used by the database storage driver (used when Supabase
 * Storage credentials are not configured). When Supabase Storage is active
 * the object lives in a bucket and only path/url/metadata are stored.
 */
export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    kind: mediaKindEnum("kind").notNull().default("image"),
    role: mediaRoleEnum("role").notNull().default("gallery"),
    storageProvider: text("storage_provider").notNull().default("supabase"),
    bucket: text("bucket").notNull(),
    storagePath: text("storage_path").notNull(),
    publicUrl: text("public_url"),
    altText: text("alt_text"),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    width: integer("width"),
    height: integer("height"),
    durationSeconds: integer("duration_seconds"),
    sortOrder: integer("sort_order").notNull().default(0),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    bytes: bytea("bytes"),
    uploadedBy: text("uploaded_by"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("media_assets_bucket_path_key").on(t.bucket, t.storagePath),
    index("media_assets_role_idx").on(t.role, t.sortOrder),
  ],
);

/* ------------------------------ products ----------------------------- */
export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    brand: text("brand").notNull().default("MKR"),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    subcategory: text("subcategory"),
    shortDescription: text("short_description"),
    description: text("description"),
    richContent: text("rich_content"),
    price: integer("price").notNull(),
    comparePrice: integer("compare_price"),
    discountPercent: integer("discount_percent").notNull().default(0),
    sku: text("sku").notNull(),
    status: productStatusEnum("status").notNull().default("draft"),
    visibility: productVisibilityEnum("visibility").notNull().default("public"),
    stock: integer("stock").notNull().default(0),
    lowStockThreshold: integer("low_stock_threshold").notNull().default(3),
    material: text("material"),
    fabric: text("fabric"),
    fit: text("fit"),
    gender: text("gender"),
    sizes: text("sizes").array(),
    colors: text("colors").array(),
    tags: text("tags").array(),
    sizeChart: jsonb("size_chart").$type<{ label: string; value: string }[]>(),
    careInstructions: text("care_instructions"),
    shippingInformation: text("shipping_information"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    keywords: text("keywords").array(),
    isFeatured: boolean("is_featured").notNull().default(false),
    createdBy: text("created_by"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("products_slug_key").on(t.slug),
    uniqueIndex("products_sku_key").on(t.sku),
    index("products_status_idx").on(t.status, t.visibility),
    index("products_category_idx").on(t.categoryId),
    index("products_created_idx").on(t.createdAt),
    index("products_price_idx").on(t.price),
  ],
);

export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sku: text("sku").notNull(),
    size: text("size"),
    color: text("color"),
    colorHex: text("color_hex"),
    price: integer("price"),
    stock: integer("stock").notNull().default(0),
    imageMediaId: uuid("image_media_id").references(() => mediaAssets.id, { onDelete: "set null" }),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("product_variants_sku_key").on(t.sku),
    index("product_variants_product_idx").on(t.productId),
    uniqueIndex("product_variants_combo_key").on(t.productId, t.size, t.color),
  ],
);

export const productImages = pgTable(
  "product_images",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    mediaId: uuid("media_id")
      .notNull()
      .references(() => mediaAssets.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
    role: mediaRoleEnum("role").notNull().default("gallery"),
    altText: text("alt_text"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [
    index("product_images_product_idx").on(t.productId, t.sortOrder),
    uniqueIndex("product_images_unique").on(t.productId, t.mediaId, t.role),
  ],
);

/* --------------------------- hero / about ---------------------------- */
export const heroSlides = pgTable("hero_slides", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  mediaId: uuid("media_id").references(() => mediaAssets.id, { onDelete: "set null" }),
  mediaType: text("media_type").notNull().default("image"),
  /* Responsive hero video system: phone-only media + composition. Desktop
     keeps media_id (16:9 composition); mobile gets its own asset so a true
     portrait cut is served instead of cropping the desktop video. */
  mobileMediaId: uuid("mobile_media_id").references(() => mediaAssets.id, { onDelete: "set null" }),
  mobileMediaType: text("mobile_media_type").notNull().default("image"),
  mobileAspectRatio: text("mobile_aspect_ratio").notNull().default("9:16"),
  mobileIsActive: boolean("mobile_is_active").notNull().default(true),
  eyebrow: text("eyebrow"),
  heading: text("heading").notNull(),
  subheading: text("subheading"),
  ctaLabel: text("cta_label"),
  ctaHref: text("cta_href"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const aboutSections = pgTable("about_sections", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  section: text("section").notNull().default("story"),
  heading: text("heading").notNull(),
  body: text("body"),
  mediaId: uuid("media_id").references(() => mediaAssets.id, { onDelete: "set null" }),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/* ---------------------------- customers ------------------------------ */
export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    /** supabase auth.users.id when Supabase Auth is the provider, else internal id */
    authUserId: text("auth_user_id"),
    provider: authProviderEnum("provider").notNull().default("email"),
    email: text("email").notNull(),
    passwordHash: text("password_hash"),
    fullName: text("full_name"),
    phone: text("phone"),
    avatarMediaId: uuid("avatar_media_id").references(() => mediaAssets.id, { onDelete: "set null" }),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    status: customerStatusEnum("status").notNull().default("active"),
    preferences: jsonb("preferences").$type<Record<string, unknown>>(),
    marketingOptIn: boolean("marketing_opt_in").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("customers_email_key").on(t.email),
    uniqueIndex("customers_auth_user_key").on(t.authUserId),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    userAgent: text("user_agent"),
    ipHash: text("ip_hash"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("sessions_token_key").on(t.tokenHash),
    index("sessions_customer_idx").on(t.customerId),
  ],
);

export const authTokens = pgTable(
  "auth_tokens",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("auth_tokens_hash_key").on(t.tokenHash), index("auth_tokens_customer_idx").on(t.customerId)],
);

export const addresses = pgTable(
  "addresses",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    label: text("label"),
    fullName: text("full_name").notNull(),
    phone: text("phone").notNull(),
    addressLine: text("address_line").notNull(),
    district: text("district").notNull(),
    area: text("area"),
    postalCode: text("postal_code"),
    notes: text("notes"),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("addresses_customer_idx").on(t.customerId),
    uniqueIndex("addresses_one_default_key")
      .on(t.customerId)
      .where(sql`${t.isDefault} = true`),
  ],
);

/* ------------------------------- cart -------------------------------- */
export const carts = pgTable(
  "carts",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "cascade" }),
    /** sha256 of the opaque httpOnly cart cookie value (anonymous carts only) */
    anonTokenHash: text("anon_token_hash"),
    status: cartStatusEnum("status").notNull().default("open"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("carts_anon_token_key").on(t.anonTokenHash),
    index("carts_customer_idx").on(t.customerId),
  ],
);

export const cartItems = pgTable(
  "cart_items",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    cartId: uuid("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(1),
    /** price snapshot only for display/audit; checkout always re-reads live price */
    priceSnapshot: integer("price_snapshot").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("cart_items_cart_idx").on(t.cartId),
    uniqueIndex("cart_items_unique").on(t.cartId, t.productId, t.variantId),
  ],
);

export const wishlistItems = pgTable(
  "wishlist_items",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("wishlist_unique").on(t.customerId, t.productId)],
);

/* ------------------------------ coupons ------------------------------ */
export const coupons = pgTable(
  "coupons",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    code: text("code").notNull(),
    description: text("description"),
    discountType: couponTypeEnum("discount_type").notNull().default("percentage"),
    discountValue: integer("discount_value").notNull(),
    maxDiscountAmount: integer("max_discount_amount"),
    minOrderAmount: integer("min_order_amount").notNull().default(0),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    usageLimit: integer("usage_limit"),
    perUserLimit: integer("per_user_limit").notNull().default(1),
    usedCount: integer("used_count").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("coupons_code_key").on(t.code)],
);

export const couponRedemptions = pgTable(
  "coupon_redemptions",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    couponId: uuid("coupon_id")
      .notNull()
      .references(() => coupons.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    orderId: uuid("order_id"),
    email: text("email"),
    amount: integer("amount").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("coupon_redemptions_coupon_idx").on(t.couponId)],
);

/* ------------------------------- orders ------------------------------ */
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    orderNumber: text("order_number").notNull(),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    /** opaque token so a guest can securely view only their own order */
    accessTokenHash: text("access_token_hash"),
    email: text("email").notNull(),
    customerName: text("customer_name").notNull(),
    phone: text("phone").notNull(),
    shippingAddress: jsonb("shipping_address").$type<Record<string, string | null>>().notNull(),
    subtotal: integer("subtotal").notNull(),
    discountTotal: integer("discount_total").notNull().default(0),
    deliveryFee: integer("delivery_fee").notNull().default(0),
    total: integer("total").notNull(),
    couponCode: text("coupon_code"),
    paymentMethod: paymentMethodEnum("payment_method").notNull().default("cod"),
    paymentPurpose: paymentPurposeEnum("payment_purpose").notNull().default("delivery_prepaid"),
    paymentStatus: paymentStatusEnum("payment_status").notNull().default("unpaid"),
    senderNumber: text("sender_number"),
    transactionId: text("transaction_id"),
    deliveryZone: text("delivery_zone").notNull(),
    status: orderStatusEnum("status").notNull().default("pending"),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("orders_number_key").on(t.orderNumber),
    index("orders_customer_idx").on(t.customerId, t.createdAt),
    index("orders_status_idx").on(t.status),
    index("orders_created_idx").on(t.createdAt),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
    productName: text("product_name").notNull(),
    productSlug: text("product_slug"),
    sku: text("sku"),
    size: text("size"),
    color: text("color"),
    imageUrl: text("image_url"),
    quantity: integer("quantity").notNull(),
    unitPrice: integer("unit_price").notNull(),
    lineTotal: integer("line_total").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

export const orderEvents = pgTable(
  "order_events",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    message: text("message"),
    actor: text("actor").notNull().default("system"),
    createdAt: createdAt(),
  },
  (t) => [index("order_events_order_idx").on(t.orderId)],
);

export const inventoryMovements = pgTable(
  "inventory_movements",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "cascade" }),
    delta: integer("delta").notNull(),
    stockAfter: integer("stock_after").notNull(),
    reason: text("reason").notNull(),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    actor: text("actor").notNull().default("system"),
    createdAt: createdAt(),
  },
  (t) => [index("inventory_movements_variant_idx").on(t.variantId)],
);

/* ------------------------------ reviews ------------------------------ */
export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    rating: integer("rating").notNull(),
    title: text("title"),
    body: text("body").notNull(),
    status: reviewStatusEnum("status").notNull().default("pending"),
    moderationNote: text("moderation_note"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("reviews_product_customer_key").on(t.productId, t.customerId),
    index("reviews_status_idx").on(t.status, t.createdAt),
  ],
);

/* -------------------- notifications / messages / etc ------------------ */
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "cascade" }),
    audience: text("audience").notNull().default("customer"),
    kind: text("kind").notNull().default("info"),
    title: text("title").notNull(),
    body: text("body"),
    link: text("link"),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("notifications_customer_idx").on(t.customerId, t.createdAt)],
);

export const contactMessages = pgTable(
  "contact_messages",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    subject: text("subject"),
    message: text("message").notNull(),
    status: messageStatusEnum("status").notNull().default("new"),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("contact_messages_status_idx").on(t.status, t.createdAt)],
);

export const subscribers = pgTable(
  "subscribers",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    email: text("email").notNull(),
    source: text("source").notNull().default("footer"),
    status: text("status").notNull().default("subscribed"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("subscribers_email_key").on(t.email)],
);

export const searchQueries = pgTable(
  "search_queries",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "cascade" }),
    query: text("query").notNull(),
    resultCount: integer("result_count").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("search_queries_customer_idx").on(t.customerId, t.createdAt)],
);

export const aiGenerations = pgTable(
  "ai_generations",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    kind: text("kind").notNull(),
    model: text("model").notNull(),
    prompt: text("prompt").notNull(),
    result: text("result"),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    createdBy: text("created_by"),
    createdAt: createdAt(),
  },
  (t) => [index("ai_generations_kind_idx").on(t.kind, t.createdAt)],
);

/** Durable event log powering Realtime (Supabase Realtime when configured, SSE fallback otherwise) */
export const realtimeEvents = pgTable(
  "realtime_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    channel: text("channel").notNull(),
    event: text("event").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (t) => [index("realtime_events_channel_idx").on(t.channel, t.id)],
);

export const analyticsDaily = pgTable(
  "analytics_daily",
  {
    day: date("day").primaryKey(),
    ordersCount: integer("orders_count").notNull().default(0),
    revenue: integer("revenue").notNull().default(0),
    visitors: integer("visitors").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("analytics_daily_created_idx").on(t.createdAt)],
);

/* --------------------------- marketing videos -------------------------- */
/**
 * Homepage brand-film advertisements. Files live in the Supabase Storage
 * bucket `mkr-marketing-videos` (path: marketing-videos/{video-id}/…) — never
 * in localStorage, the repo, or the database. Admin operations run through
 * server-side session validation; RLS keeps anonymous reads to published rows.
 */
export const marketingVideos = pgTable(
  "marketing_videos",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    title: text("title").notNull(),
    description: text("description"),
    videoBucket: text("video_bucket").notNull(),
    videoPath: text("video_path").notNull(),
    videoUrl: text("video_url").notNull(),
    videoMime: text("video_mime").notNull().default("video/mp4"),
    videoSizeBytes: integer("video_size_bytes").notNull().default(0),
    posterBucket: text("poster_bucket"),
    posterPath: text("poster_path"),
    posterUrl: text("poster_url"),
    ctaText: text("cta_text"),
    ctaUrl: text("cta_url"),
    overlayPosition: text("overlay_position").notNull().default("left"),
    autoplay: boolean("autoplay").notNull().default(true),
    muted: boolean("muted").notNull().default(true),
    loop: boolean("loop").notNull().default(true),
    showControls: boolean("show_controls").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    isPublished: boolean("is_published").notNull().default(false),
    displayOrder: integer("display_order").notNull().default(0),
    uploadedBy: text("uploaded_by"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("marketing_videos_order_idx").on(t.displayOrder, t.createdAt)],
);
