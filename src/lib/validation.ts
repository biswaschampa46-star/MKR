import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address").max(180);
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^(\+?880|0)1[3-9]\d{8}$/, "Enter a valid Bangladeshi mobile number (e.g. 01712345678)");

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(120),
  email: emailSchema,
  phone: phoneSchema.optional().or(z.literal("")),
  password: z.string().min(8, "Use at least 8 characters").max(72),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password").max(72),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z.object({
  token: z.string().min(10, "Reset link is invalid"),
  password: z.string().min(8, "Use at least 8 characters").max(72),
});

export const addressSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().trim().max(60).optional().or(z.literal("")),
  fullName: z.string().trim().min(2, "Recipient name is required").max(120),
  phone: phoneSchema,
  addressLine: z.string().trim().min(6, "Enter the full address").max(300),
  district: z.string().trim().min(2, "Select a district").max(80),
  area: z.string().trim().max(120).optional().or(z.literal("")),
  postalCode: z.string().trim().max(12).optional().or(z.literal("")),
  notes: z.string().trim().max(300).optional().or(z.literal("")),
  isDefault: z.coerce.boolean().optional(),
});

export const checkoutSchema = z.object({
  email: emailSchema,
  customerName: z.string().trim().min(2, "Enter the recipient name").max(120),
  phone: phoneSchema,
  addressLine: z.string().trim().min(6, "Enter the delivery address").max(300),
  district: z.string().trim().min(2, "Select a district").max(80),
  area: z.string().trim().max(120).optional().or(z.literal("")),
  postalCode: z.string().trim().max(12).optional().or(z.literal("")),
  deliveryZone: z.string().trim().min(1, "Select the delivery zone"),
  paymentMethod: z.enum(["cod", "bkash", "nagad", "rocket"]),
  // Delivery charge is ALWAYS prepaid via mobile money — COD covers products only.
  deliveryPrepaidMethod: z.enum(["bkash", "nagad", "rocket"]),
  deliverySenderNumber: z
    .string()
    .trim()
    .regex(/^(\+?880|0)1[3-9]\d{8}$/, "Enter the bKash/Nagad/Rocket number you sent the delivery charge from"),
  deliveryTransactionId: z.string().trim().min(3, "Enter the delivery-charge transaction ID").max(60),
  // Legacy fields: kept so old clients don't break. Server ignores paymentPurpose
  // and always treats delivery as prepaid. senderNumber/transactionId are only
  // used when paymentMethod is a prepaid full-payment method (bkash/nagad/rocket).
  paymentPurpose: z.enum(["delivery_prepaid", "full_prepaid"]).default("delivery_prepaid"),
  senderNumber: z.string().trim().max(20).optional().or(z.literal("")),
  transactionId: z.string().trim().max(60).optional().or(z.literal("")),
  couponCode: z.string().trim().max(40).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  saveAddress: z.coerce.boolean().optional(),
});

export const cartItemSchema = z.object({
  productId: z.string().uuid("Invalid product"),
  variantId: z.string().uuid().nullable().optional(),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1").max(20),
});

export const cartUpdateSchema = z.object({
  itemId: z.string().uuid(),
  quantity: z.coerce.number().int().min(0).max(20),
});

export const reviewSchema = z.object({
  productId: z.string().uuid(),
  rating: z.coerce.number().int().min(1, "Choose a rating").max(5),
  title: z.string().trim().max(120).optional().or(z.literal("")),
  body: z.string().trim().min(10, "Tell us a little more").max(2000),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(120),
  email: emailSchema,
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  subject: z.string().trim().max(160).optional().or(z.literal("")),
  message: z.string().trim().min(10, "Write your message").max(2000),
});

export const subscribeSchema = z.object({ email: emailSchema, source: z.string().trim().max(40).optional() });

export const adminLoginSchema = z.object({
  email: z.string().trim().email("Enter the admin email"),
  password: z.string().min(6, "Enter the admin password"),
});

export const bootstrapAdminSchema = z.object({
  email: z.string().trim().email("Enter an email"),
  password: z.string().min(8, "Use at least 8 characters"),
});

const variantSchema = z.object({
  id: z.string().uuid().optional(),
  sku: z.string().trim().min(2, "Variant SKU is required").max(60),
  size: z.string().trim().max(30).optional().or(z.literal("")),
  color: z.string().trim().max(40).optional().or(z.literal("")),
  colorHex: z.string().trim().max(9).optional().or(z.literal("")),
  price: z.coerce.number().int().min(0).optional().nullable(),
  stock: z.coerce.number().int().min(0),
  isActive: z.coerce.boolean().optional(),
});

export const productSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z
    .string()
    .trim()
    .min(2, "Slug is required")
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug may contain lowercase letters, numbers and dashes"),
  name: z.string().trim().min(2, "Product name is required").max(160),
  brand: z.string().trim().max(80).default("MKR"),
  categoryId: z.string().uuid().nullable().optional(),
  subcategory: z.string().trim().max(80).optional().or(z.literal("")),
  shortDescription: z.string().trim().max(300).optional().or(z.literal("")),
  description: z.string().trim().max(6000).optional().or(z.literal("")),
  richContent: z.string().trim().max(20000).optional().or(z.literal("")),
  price: z.coerce.number().int().min(0, "Price is required"),
  comparePrice: z.coerce.number().int().min(0).nullable().optional(),
  sku: z.string().trim().min(2, "SKU is required").max(60),
  status: z.enum(["draft", "active", "archived"]),
  visibility: z.enum(["public", "hidden"]),
  stock: z.coerce.number().int().min(0).default(0),
  lowStockThreshold: z.coerce.number().int().min(0).default(3),
  material: z.string().trim().max(160).optional().or(z.literal("")),
  fabric: z.string().trim().max(160).optional().or(z.literal("")),
  fit: z.string().trim().max(80).optional().or(z.literal("")),
  gender: z.string().trim().max(40).optional().or(z.literal("")),
  sizes: z.array(z.string().trim().min(1).max(30)).default([]),
  colors: z.array(z.string().trim().min(1).max(40)).default([]),
  tags: z.array(z.string().trim().min(1).max(40)).default([]),
  keywords: z.array(z.string().trim().min(1).max(60)).default([]),
  sizeChart: z.array(z.object({ label: z.string().trim().max(40), value: z.string().trim().max(120) })).default([]),
  careInstructions: z.string().trim().max(1000).optional().or(z.literal("")),
  shippingInformation: z.string().trim().max(1000).optional().or(z.literal("")),
  seoTitle: z.string().trim().max(200).optional().or(z.literal("")),
  seoDescription: z.string().trim().max(320).optional().or(z.literal("")),
  isFeatured: z.coerce.boolean().optional(),
  variants: z.array(variantSchema).default([]),
});

export const couponSchema = z.object({
  id: z.string().uuid().optional(),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(3, "Coupon code is required")
    .max(30)
    .regex(/^[A-Z0-9-]+$/, "Use letters, numbers and dashes only"),
  description: z.string().trim().max(200).optional().or(z.literal("")),
  discountType: z.enum(["percentage", "fixed"]),
  discountValue: z.coerce.number().int().min(1, "Discount must be greater than zero"),
  maxDiscountAmount: z.coerce.number().int().min(0).nullable().optional(),
  minOrderAmount: z.coerce.number().int().min(0).default(0),
  startsAt: z.string().trim().optional().or(z.literal("")),
  expiresAt: z.string().trim().optional().or(z.literal("")),
  usageLimit: z.coerce.number().int().min(0).nullable().optional(),
  perUserLimit: z.coerce.number().int().min(1).default(1),
  isActive: z.coerce.boolean().optional(),
});

export const categorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Category name is required").max(80),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug may contain lowercase letters, numbers and dashes"),
  description: z.string().trim().max(400).optional().or(z.literal("")),
  parentId: z.string().uuid().nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.coerce.boolean().optional(),
});

export const notificationSchema = z.object({
  title: z.string().trim().min(3, "Title is required").max(160),
  body: z.string().trim().max(1000).optional().or(z.literal("")),
  link: z.string().trim().max(200).optional().or(z.literal("")),
  kind: z.enum(["info", "order", "payment", "promo"]).default("info"),
  customerId: z.string().uuid().nullable().optional(),
});

export const deliverySettingsSchema = z.object({
  zones: z
    .array(
      z.object({
        key: z.string().trim().min(1).max(40),
        label: z.string().trim().min(1).max(80),
        fee: z.coerce.number().int().min(0).max(5000),
      }),
    )
    .min(1, "At least one delivery zone is required"),
  freeDeliveryThreshold: z.union([z.coerce.number().int().min(0), z.null()]).optional(),
  codEnabled: z.coerce.boolean().optional(),
  prepaidDeliveryEnabled: z.coerce.boolean().optional(),
});

export const paymentSettingsSchema = z.object({
  bkash: z.string().trim().max(20).optional().or(z.literal("")),
  nagad: z.string().trim().max(20).optional().or(z.literal("")),
  rocket: z.string().trim().max(20).optional().or(z.literal("")),
  instructions: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const contactSettingsSchema = z.object({
  email: z.string().trim().max(160).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  whatsapp: z.string().trim().max(40).optional().or(z.literal("")),
  /* Floating contact dock link (e.g. https://wa.me/8801XXXXXXXXX). */
  whatsappUrl: z.string().trim().max(300).optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  hours: z.string().trim().max(160).optional().or(z.literal("")),
  facebook: z.string().trim().max(200).optional().or(z.literal("")),
  instagram: z.string().trim().max(200).optional().or(z.literal("")),
});

export const faqSettingsSchema = z.object({
  items: z
    .array(z.object({ question: z.string().trim().min(3).max(200), answer: z.string().trim().min(3).max(2000) }))
    .max(30),
});

export const marketingSettingsSchema = z.object({
  announcement: z.string().trim().max(240).optional().or(z.literal("")),
  announcementHref: z.string().trim().max(200).optional().or(z.literal("")),
  showAnnouncement: z.coerce.boolean().optional(),
  heroAutoplaySeconds: z.coerce.number().int().min(0).max(30).optional(),
  metaTitleSuffix: z.string().trim().max(80).optional().or(z.literal("")),
});

export const orderStatusSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"]),
  message: z.string().trim().max(300).optional().or(z.literal("")),
});

export const reviewModerationSchema = z.object({
  reviewId: z.string().uuid(),
  status: z.enum(["pending", "approved", "rejected"]),
  note: z.string().trim().max(300).optional().or(z.literal("")),
});

export const aiAssistSchema = z.object({
  kind: z.enum(["product_description", "size_recommendation", "assistant"]),
  prompt: z.string().trim().min(3).max(4000),
  productId: z.string().uuid().nullable().optional(),
  height: z.coerce.number().min(80).max(260).nullable().optional(),
  weight: z.coerce.number().min(20).max(300).nullable().optional(),
  // Phase 14 — deterministic size engine inputs (all optional).
  age: z.coerce.number().int().min(10).max(100).nullable().optional(),
  bodyType: z.enum(["slim", "regular", "fat"]).nullable().optional(),
  waistInches: z.coerce.number().min(20).max(50).nullable().optional(),
  legOpeningInches: z.coerce.number().min(10).max(30).nullable().optional(),
});

export type ProductInput = z.infer<typeof productSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type CouponInput = z.infer<typeof couponSchema>;
export type AddressFormInput = z.infer<typeof addressSchema>;
