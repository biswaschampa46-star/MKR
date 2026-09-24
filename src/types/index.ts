export type Money = number;

export type MediaRef = {
  id: string;
  storagePath: string;
  publicUrl: string;
  altText: string | null;
  kind: "image" | "video" | "document";
  role: string;
  sortOrder: number;
  width: number | null;
  height: number | null;
};

export type ProductImageRef = MediaRef & { productImageId: string; variantId: string | null };

export type Variant = {
  id: string;
  productId: string;
  sku: string;
  size: string | null;
  color: string | null;
  colorHex: string | null;
  price: number;
  stock: number;
  isActive: boolean;
  imageUrl: string | null;
};

export type ProductSummary = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  categoryName: string | null;
  categorySlug: string | null;
  /** UUID of the product's category (used to scope related-product queries). */
  categoryId?: string | null;
  shortDescription: string | null;
  price: number;
  comparePrice: number | null;
  discountPercent: number;
  stock: number;
  isFeatured: boolean;
  mainImage: MediaRef | null;
  hoverImage: MediaRef | null;
  sizes: string[];
  colors: string[];
  createdAt: string;
};

export type ProductDetail = ProductSummary & {
  description: string | null;
  richContent: string | null;
  subcategory: string | null;
  sku: string;
  status: "draft" | "active" | "archived";
  visibility: "public" | "hidden";
  material: string | null;
  fabric: string | null;
  fit: string | null;
  gender: string | null;
  sizeChart: { label: string; value: string }[];
  careInstructions: string | null;
  shippingInformation: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  keywords: string[];
  tags: string[];
  images: ProductImageRef[];
  variants: Variant[];
  ratingAverage: number | null;
  ratingCount: number;
};

export type CartLine = {
  id: string;
  productId: string;
  variantId: string | null;
  slug: string;
  name: string;
  size: string | null;
  color: string | null;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  stockAvailable: number;
  inStock: boolean;
};

export type CartView = {
  id: string | null;
  lines: CartLine[];
  subtotal: number;
  itemCount: number;
};

export type AddressInput = {
  id?: string;
  label?: string | null;
  fullName: string;
  phone: string;
  addressLine: string;
  district: string;
  area?: string | null;
  postalCode?: string | null;
  notes?: string | null;
  isDefault?: boolean;
};

export type DeliveryZone = { key: string; label: string; fee: number };

export type DeliverySettings = {
  zones: DeliveryZone[];
  freeDeliveryThreshold: number | null;
  codEnabled: boolean;
  prepaidDeliveryEnabled: boolean;
};

export type PaymentSettings = {
  bkash: string | null;
  nagad: string | null;
  rocket: string | null;
  instructions: string | null;
  configuredSource: "database" | "environment" | "none";
};

export type ContactSettings = {
  email: string | null;
  phone: string | null;
  /** Human-readable WhatsApp number printed on the contact page. */
  whatsapp: string | null;
  /** Admin-configured chat link (https://wa.me/…) used by the contact dock. */
  whatsappUrl: string | null;
  address: string | null;
  hours: string | null;
  facebook: string | null;
  instagram: string | null;
};

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned";

export type PaymentStatus = "unpaid" | "awaiting_verification" | "verified" | "failed" | "refunded";

export type OrderSummary = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: "cod" | "bkash" | "nagad" | "rocket";
  paymentPurpose: "delivery_prepaid" | "full_prepaid";
  total: number;
  subtotal: number;
  discountTotal: number;
  deliveryFee: number;
  customerName: string;
  createdAt: string;
  itemCount: number;
};

export type OrderDetail = OrderSummary & {
  email: string;
  phone: string;
  shippingAddress: Record<string, string | null>;
  couponCode: string | null;
  senderNumber: string | null;
  transactionId: string | null;
  deliveryZone: string;
  notes: string | null;
  items: {
    id: string;
    productId: string | null;
    productSlug: string | null;
    productName: string;
    sku: string | null;
    size: string | null;
    color: string | null;
    imageUrl: string | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
  events: { id: string; status: string; message: string | null; createdAt: string }[];
};

export type CouponValidation = {
  valid: boolean;
  code: string | null;
  discount: number;
  message: string;
};

export type CustomerProfile = {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  provider: "email" | "google";
  marketingOptIn: boolean;
  createdAt: string;
};

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };
