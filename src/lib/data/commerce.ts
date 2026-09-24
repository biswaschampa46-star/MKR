import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import { db, guarded, rawQuery } from "@/db/client";
import {
  cartItems,
  carts,
  couponRedemptions,
  coupons,
  customers,
  mediaAssets,
  orderEvents,
  orderItems,
  orders,
  productVariants,
  products,
  wishlistItems,
} from "@/db/schema";
import { sha256, randomToken } from "@/lib/auth/customer";
import { friendlyOrderError } from "@/lib/utils";
import type { CartLine, CartView, CouponValidation, OrderDetail, OrderSummary } from "@/types";

/* ================================== CART ================================= */
export type CartIdentity = { customerId: string | null; anonToken: string | null };

export async function findOpenCartId(identity: CartIdentity, create: boolean): Promise<string | null> {
  if (identity.customerId) {
    const existing = await db
      .select({ id: carts.id })
      .from(carts)
      .where(and(eq(carts.customerId, identity.customerId), eq(carts.status, "open")))
      .orderBy(desc(carts.createdAt))
      .limit(1);
    if (existing[0]) return existing[0].id;
    if (!create) return null;
    const inserted = await db
      .insert(carts)
      .values({ customerId: identity.customerId })
      .returning({ id: carts.id });
    return inserted[0].id;
  }

  if (!identity.anonToken) return null;
  const tokenHash = sha256(identity.anonToken);
  const existing = await db
    .select({ id: carts.id })
    .from(carts)
    .where(and(eq(carts.anonTokenHash, tokenHash), eq(carts.status, "open")))
    .limit(1);
  if (existing[0]) return existing[0].id;
  if (!create) return null;
  const inserted = await db
    .insert(carts)
    .values({ anonTokenHash: tokenHash })
    .returning({ id: carts.id });
  return inserted[0].id;
}

type CartLineRow = {
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
  stockAvailable: number;
  productActive: boolean;
};

export async function getCartView(identity: CartIdentity): Promise<CartView> {
  return guarded("Loading cart", async () => {
    const cartId = await findOpenCartId(identity, false);
    if (!cartId) return { id: null, lines: [], subtotal: 0, itemCount: 0 };

    const rows = await rawQuery<CartLineRow>(
      sql`select ci.id, ci.product_id as "productId", ci.variant_id as "variantId", p.slug, p.name,
                 pv.size, pv.color,
                 (select coalesce(ma.public_url, '/api/media/' || ma.id)
                    from product_images pi join media_assets ma on ma.id = pi.media_id
                   where pi.product_id = p.id order by (pi.role = 'main') desc, pi.sort_order asc limit 1) as "imageUrl",
                 case when ci.variant_id is null then p.price else coalesce(pv.price, p.price) end as "unitPrice",
                 ci.quantity,
                 case when ci.variant_id is null then p.stock else coalesce(pv.stock, 0) end as "stockAvailable",
                 (p.status = 'active' and p.visibility = 'public') as "productActive"
            from cart_items ci
            join products p on p.id = ci.product_id
            left join product_variants pv on pv.id = ci.variant_id
           where ci.cart_id = ${cartId}
           order by ci.created_at asc`,
    );

    const lines: CartLine[] = rows.map((row) => ({
      id: row.id,
      productId: row.productId,
      variantId: row.variantId,
      slug: row.slug,
      name: row.name,
      size: row.size,
      color: row.color,
      imageUrl: row.imageUrl,
      unitPrice: Number(row.unitPrice),
      quantity: Number(row.quantity),
      lineTotal: Number(row.unitPrice) * Number(row.quantity),
      stockAvailable: Number(row.stockAvailable),
      inStock: row.productActive && Number(row.stockAvailable) >= Number(row.quantity),
    }));

    return {
      id: cartId,
      lines,
      subtotal: lines.reduce((sum, line) => sum + line.lineTotal, 0),
      itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    };
  });
}

export async function cartItemCount(identity: CartIdentity): Promise<number> {
  const cartId = await findOpenCartId(identity, false);
  if (!cartId) return 0;
  const rows = await rawQuery<{ total: string }>(
    sql`select coalesce(sum(quantity), 0)::text as total from cart_items where cart_id = ${cartId}`,
  );
  return Number(rows[0]?.total ?? 0);
}

export async function addCartItem(input: {
  identity: CartIdentity;
  productId: string;
  variantId: string | null;
  quantity: number;
}) {
  const cartId = await findOpenCartId(input.identity, true);
  if (!cartId) throw new Error("Unable to start a cart. Enable cookies and try again.");

  const productRow = await db.select().from(products).where(eq(products.id, input.productId)).limit(1);
  const product = productRow[0];
  if (!product || product.status !== "active" || product.visibility !== "public") {
    throw new Error("This product is not available right now.");
  }

  let unitPrice = product.price;
  let stock = product.stock;
  if (input.variantId) {
    const variantRow = await db.select().from(productVariants).where(eq(productVariants.id, input.variantId)).limit(1);
    const variant = variantRow[0];
    if (!variant || variant.productId !== product.id || !variant.isActive) {
      throw new Error("That size/colour is no longer offered.");
    }
    unitPrice = variant.price ?? product.price;
    stock = variant.stock;
  }

  if (stock <= 0) throw new Error("This item is out of stock.");

  const existing = await db
    .select()
    .from(cartItems)
    .where(
      and(
        eq(cartItems.cartId, cartId),
        eq(cartItems.productId, input.productId),
        input.variantId ? eq(cartItems.variantId, input.variantId) : isNull(cartItems.variantId),
      ),
    )
    .limit(1);

  const nextQuantity = Math.min((existing[0]?.quantity ?? 0) + input.quantity, stock);

  if (existing[0]) {
    await db
      .update(cartItems)
      .set({ quantity: nextQuantity, priceSnapshot: unitPrice, updatedAt: new Date() })
      .where(eq(cartItems.id, existing[0].id));
  } else {
    await db.insert(cartItems).values({
      cartId,
      productId: input.productId,
      variantId: input.variantId ?? null,
      quantity: Math.min(input.quantity, stock),
      priceSnapshot: unitPrice,
    });
  }

  await db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cartId));
  return { cartId, quantity: nextQuantity };
}

export async function setCartItemQuantity(identity: CartIdentity, itemId: string, quantity: number) {
  const cartId = await findOpenCartId(identity, false);
  if (!cartId) throw new Error("Your cart is empty.");
  if (quantity <= 0) {
    await db.delete(cartItems).where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)));
    return { removed: true };
  }

  const rows = await rawQuery<{ stock: number }>(
    sql`select case when ci.variant_id is null then p.stock else coalesce(pv.stock, 0) end as stock
          from cart_items ci
          join products p on p.id = ci.product_id
          left join product_variants pv on pv.id = ci.variant_id
         where ci.id = ${itemId} and ci.cart_id = ${cartId}
         limit 1`,
  );
  const available = Number(rows[0]?.stock ?? 0);
  if (available <= 0) throw new Error("This item is out of stock.");
  const next = Math.min(quantity, available);
  await db
    .update(cartItems)
    .set({ quantity: next, updatedAt: new Date() })
    .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)));
  return { quantity: next, clamped: next < quantity };
}

export async function removeCartItem(identity: CartIdentity, itemId: string) {
  const cartId = await findOpenCartId(identity, false);
  if (!cartId) return;
  await db.delete(cartItems).where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)));
}

export async function emptyCart(cartId: string) {
  await db.delete(cartItems).where(eq(cartItems.cartId, cartId));
}

/** Moves an anonymous cart onto the customer account after sign-in. */
export async function mergeAnonymousCart(anonToken: string | null, customerId: string) {
  if (!anonToken) return;
  const anonHash = sha256(anonToken);
  const anonCart = await db
    .select({ id: carts.id })
    .from(carts)
    .where(and(eq(carts.anonTokenHash, anonHash), eq(carts.status, "open")))
    .limit(1);
  if (!anonCart[0]) return;

  const customerCartId = await findOpenCartId({ customerId, anonToken: null }, true);
  if (!customerCartId) return;
  if (customerCartId === anonCart[0].id) {
    await db.update(carts).set({ customerId, anonTokenHash: null }).where(eq(carts.id, anonCart[0].id));
    return;
  }

  const items = await db.select().from(cartItems).where(eq(cartItems.cartId, anonCart[0].id));
  for (const item of items) {
    await db
      .insert(cartItems)
      .values({
        cartId: customerCartId,
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        priceSnapshot: item.priceSnapshot,
      })
      .onConflictDoUpdate({
        target: [cartItems.cartId, cartItems.productId, cartItems.variantId],
        set: { quantity: sql`least(${cartItems.quantity} + ${item.quantity}, 20)`, updatedAt: new Date() },
      });
  }
  await db.delete(carts).where(eq(carts.id, anonCart[0].id));
}

/* ================================ WISHLIST =============================== */
export async function listWishlist(customerId: string) {
  return guarded("Loading wishlist", async () => {
    const rows = await rawQuery<{
      id: string;
      productId: string;
      slug: string;
      name: string;
      price: number;
      comparePrice: number | null;
      stock: number;
      imageUrl: string | null;
      createdAt: string;
    }>(
      sql`select w.id, w.product_id as "productId", p.slug, p.name, p.price, p.compare_price as "comparePrice",
                 p.stock, w.created_at as "createdAt",
                 (select coalesce(ma.public_url, '/api/media/' || ma.id)
                    from product_images pi join media_assets ma on ma.id = pi.media_id
                   where pi.product_id = p.id order by (pi.role = 'main') desc, pi.sort_order asc limit 1) as "imageUrl"
            from wishlist_items w
            join products p on p.id = w.product_id
           where w.customer_id = ${customerId}
           order by w.created_at desc`,
    );
    return rows;
  });
}

export async function toggleWishlist(customerId: string, productId: string) {
  const existing = await db
    .select({ id: wishlistItems.id })
    .from(wishlistItems)
    .where(and(eq(wishlistItems.customerId, customerId), eq(wishlistItems.productId, productId)))
    .limit(1);
  if (existing[0]) {
    await db.delete(wishlistItems).where(eq(wishlistItems.id, existing[0].id));
    return { active: false };
  }
  await db.insert(wishlistItems).values({ customerId, productId }).onConflictDoNothing();
  return { active: true };
}

export async function isWishlisted(customerId: string | null, productId: string) {
  if (!customerId) return false;
  const existing = await db
    .select({ id: wishlistItems.id })
    .from(wishlistItems)
    .where(and(eq(wishlistItems.customerId, customerId), eq(wishlistItems.productId, productId)))
    .limit(1);
  return Boolean(existing[0]);
}

/* ================================= COUPONS =============================== */
export async function validateCoupon(input: {
  code: string;
  subtotal: number;
  customerId: string | null;
  email: string | null;
}): Promise<CouponValidation> {
  const rows = await rawQuery<{ result: CouponValidation }>(
    sql`select public.validate_coupon(${input.code}::text, ${input.subtotal}::int, ${input.customerId}::uuid, ${input.email}::text) as result`,
  );
  const result = rows[0]?.result;
  if (!result) return { valid: false, code: null, discount: 0, message: "Coupon validation failed. Try again." };
  return result;
}

export async function listCoupons() {
  return db.select().from(coupons).orderBy(desc(coupons.createdAt));
}

export async function saveCoupon(input: {
  id?: string;
  code: string;
  description: string | null;
  discountType: "percentage" | "fixed";
  discountValue: number;
  maxDiscountAmount: number | null;
  minOrderAmount: number;
  startsAt: Date | null;
  expiresAt: Date | null;
  usageLimit: number | null;
  perUserLimit: number;
  isActive: boolean;
}) {
  const { id, ...values } = input;
  if (id) {
    await db.update(coupons).set({ ...values, updatedAt: new Date() }).where(eq(coupons.id, id));
    return id;
  }
  const inserted = await db.insert(coupons).values(values).returning({ id: coupons.id });
  return inserted[0].id;
}

export async function deleteCoupon(id: string) {
  await db.delete(coupons).where(eq(coupons.id, id));
}

export async function listRedemptions(limit = 100) {
  return db
    .select({
      id: couponRedemptions.id,
      code: coupons.code,
      amount: couponRedemptions.amount,
      email: couponRedemptions.email,
      createdAt: couponRedemptions.createdAt,
      orderId: couponRedemptions.orderId,
    })
    .from(couponRedemptions)
    .innerJoin(coupons, eq(coupons.id, couponRedemptions.couponId))
    .orderBy(desc(couponRedemptions.createdAt))
    .limit(limit);
}

/* ================================= ORDERS ================================ */
export type PlaceOrderInput = {
  cartId: string;
  customerId: string | null;
  email: string;
  customerName: string;
  phone: string;
  deliveryZone: string;
  paymentMethod: "cod" | "bkash" | "nagad" | "rocket";
  /** Delivery fee is ALWAYS prepaid via mobile money — COD covers products only. */
  deliveryPrepaidMethod: "bkash" | "nagad" | "rocket";
  deliverySenderNumber: string;
  deliveryTransactionId: string;
  paymentPurpose: "delivery_prepaid" | "full_prepaid";
  senderNumber: string | null;
  transactionId: string | null;
  couponCode: string | null;
  notes: string | null;
  shipping: Record<string, string | null>;
};

export type PlaceOrderResult = {
  orderId: string;
  orderNumber: string;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  itemCount: number;
  couponCode: string | null;
  accessToken: string;
};

export class CheckoutError extends Error {}

export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const accessToken = randomToken(24);
  const accessHash = sha256(accessToken);

  // Server rule: delivery charge is ALWAYS prepaid. COD = products on delivery,
  // delivery fee already paid via mobile money.
  const paymentPurpose: "delivery_prepaid" | "full_prepaid" =
    input.paymentMethod === "cod" ? "delivery_prepaid" : "full_prepaid";

  // For COD, the order-level sender/txn fields carry the DELIVERY prepayment
  // proof so admin verification + /track keep working on one set of columns.
  const senderNumber =
    input.paymentMethod === "cod" ? input.deliverySenderNumber : input.senderNumber;
  const transactionId =
    input.paymentMethod === "cod" ? input.deliveryTransactionId : input.transactionId;

  try {
    const rows = await rawQuery<{
      result: {
        orderId: string;
        orderNumber: string;
        subtotal: number;
        discount: number;
        deliveryFee: number;
        total: number;
        itemCount: number;
        couponCode: string | null;
      };
    }>(
      sql`select public.place_order(
            ${input.cartId}::uuid,
            ${input.customerId}::uuid,
            ${accessHash}::text,
            ${input.email}::text,
            ${input.customerName}::text,
            ${input.phone}::text,
            ${JSON.stringify(input.shipping)}::jsonb,
            ${input.deliveryZone}::text,
            ${input.paymentMethod}::text,
            ${paymentPurpose}::text,
            ${senderNumber}::text,
            ${transactionId}::text,
            ${input.notes}::text,
            ${input.couponCode}::text
          ) as result`,
    );
    const result = rows[0]?.result;
    if (!result) throw new CheckoutError("We could not place your order. Please try again.");
    return {
      orderId: result.orderId,
      orderNumber: result.orderNumber,
      subtotal: Number(result.subtotal),
      discount: Number(result.discount),
      deliveryFee: Number(result.deliveryFee),
      total: Number(result.total),
      itemCount: Number(result.itemCount),
      couponCode: result.couponCode ?? null,
      accessToken,
    };
  } catch (error) {
    if (error instanceof CheckoutError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new CheckoutError(friendlyOrderError(message));
  }
}

const orderSummarySelection = sql`
  o.id, o.order_number as "orderNumber", o.status, o.payment_status as "paymentStatus",
  o.payment_method as "paymentMethod", o.payment_purpose as "paymentPurpose",
  o.total, o.subtotal, o.discount_total as "discountTotal", o.delivery_fee as "deliveryFee",
  o.customer_name as "customerName", o.created_at as "createdAt",
  (select coalesce(sum(quantity),0)::int from order_items oi where oi.order_id = o.id) as "itemCount"
`;

export async function listCustomerOrders(customerId: string): Promise<OrderSummary[]> {
  return rawQuery<OrderSummary>(
    sql`select ${orderSummarySelection} from orders o
         where o.customer_id = ${customerId}
         order by o.created_at desc limit 100`,
  );
}

export async function listOrdersForAdmin(filters: { status?: string; search?: string; limit?: number } = {}) {
  const clauses = [sql`true`];
  if (filters.status) clauses.push(sql`o.status = ${filters.status}::order_status`);
  if (filters.search) {
    const like = `%${filters.search.trim()}%`;
    clauses.push(sql`(o.order_number ilike ${like} or o.customer_name ilike ${like} or o.email ilike ${like}
                      or coalesce(o.transaction_id, '') ilike ${like} or o.phone ilike ${like})`);
  }
  return rawQuery<OrderSummary & { email: string; phone: string; transactionId: string | null }>(
    sql`select ${orderSummarySelection}, o.email, o.phone, o.transaction_id as "transactionId"
         from orders o
         where ${sql.join(clauses, sql` and `)}
         order by o.created_at desc limit ${filters.limit ?? 200}`,
  );
}

export async function getOrderDetail(orderId: string): Promise<OrderDetail | null> {
  const rows = await rawQuery<{
    id: string;
    orderNumber: string;
    status: OrderDetail["status"];
    paymentStatus: OrderDetail["paymentStatus"];
    paymentMethod: OrderDetail["paymentMethod"];
    paymentPurpose: OrderDetail["paymentPurpose"];
    total: number;
    subtotal: number;
    discountTotal: number;
    deliveryFee: number;
    customerName: string;
    createdAt: string;
    email: string;
    phone: string;
    shippingAddress: Record<string, string | null>;
    couponCode: string | null;
    senderNumber: string | null;
    transactionId: string | null;
    deliveryZone: string;
    notes: string | null;
    itemCount: number;
    items: OrderDetail["items"];
    events: OrderDetail["events"];
  }>(
    sql`select ${orderSummarySelection}, o.email, o.phone, o.shipping_address as "shippingAddress",
               o.coupon_code as "couponCode", o.sender_number as "senderNumber",
               o.transaction_id as "transactionId", o.delivery_zone as "deliveryZone", o.notes,
               coalesce((select jsonb_agg(jsonb_build_object(
                   'id', oi.id, 'productId', oi.product_id, 'productSlug', oi.product_slug,
                   'productName', oi.product_name, 'sku', oi.sku, 'size', oi.size, 'color', oi.color,
                   'imageUrl', oi.image_url, 'quantity', oi.quantity, 'unitPrice', oi.unit_price,
                   'lineTotal', oi.line_total) order by oi.created_at)
                 from order_items oi where oi.order_id = o.id), '[]'::jsonb) as items,
               coalesce((select jsonb_agg(jsonb_build_object(
                   'id', oe.id, 'status', oe.status, 'message', oe.message, 'createdAt', oe.created_at) order by oe.created_at)
                 from order_events oe where oe.order_id = o.id), '[]'::jsonb) as events
          from orders o
         where o.id = ${orderId}
         limit 1`,
  );
  const row = rows[0];
  if (!row) return null;
  return {
    ...row,
    total: Number(row.total),
    subtotal: Number(row.subtotal),
    discountTotal: Number(row.discountTotal),
    deliveryFee: Number(row.deliveryFee),
    itemCount: Number(row.itemCount ?? 0),
    createdAt: new Date(row.createdAt).toISOString(),
  };
}

export async function getOrderAccessHash(orderId: string) {
  const rows = await db
    .select({ hash: orders.accessTokenHash, customerId: orders.customerId })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateOrderStatus(input: {
  orderId: string;
  status: OrderDetail["status"];
  message: string | null;
  actor: string;
}) {
  const rows = await rawQuery<{ result: unknown }>(
    sql`select public.update_order_status(${input.orderId}::uuid, ${input.status}::order_status, ${input.actor}::text, ${input.message}::text) as result`,
  );
  return rows[0]?.result ?? null;
}

export async function verifyOrderPayment(orderId: string, actor: string) {
  const rows = await rawQuery<{ result: unknown }>(
    sql`select public.verify_order_payment(${orderId}::uuid, ${actor}::text) as result`,
  );
  return rows[0]?.result ?? null;
}

export async function findOrderForTracking(orderNumber: string, identifier: string) {
  const rows = await rawQuery<{ id: string; orderNumber: string; status: string; createdAt: string; total: number }>(
    sql`select id, order_number as "orderNumber", status, created_at as "createdAt", total
          from orders
         where upper(order_number) = upper(${orderNumber})
           and (lower(email) = lower(${identifier}) or phone = ${identifier})
         limit 1`,
  );
  return rows[0] ?? null;
}

/* Phase 10/11 — analytics computed directly from authoritative orders data
   (Option B). No aggregate table, no fake history. Every metric documents
   exactly how cancelled orders are treated. */
export type OrderStats = {
  /** ALL orders ever placed, cancelled included (labelled explicitly in the UI). */
  ordersTotal: number;
  /** Orders NOT in a cancelled/returned terminal state — the "active" count. */
  activeOrders: number;
  /** Cancelled + returned orders, reported separately so the numbers reconcile. */
  cancelledOrders: number;
  /** Sum of order totals excluding cancelled orders. */
  revenue: number;
  pending: number;
  customers: number;
  lowStock: number;
  awaitingPayment: number;
};

export async function orderStats(): Promise<OrderStats> {
  const rows = await rawQuery<{
    orders_total: string;
    active_orders: string;
    cancelled_orders: string;
    revenue: string;
    pending: string;
    customers: string;
    low_stock: string;
    awaiting_payment: string;
  }>(
    sql`select
          (select count(*)::text from orders) as orders_total,
          (select count(*)::text from orders where status not in ('cancelled','returned')) as active_orders,
          (select count(*)::text from orders where status in ('cancelled','returned')) as cancelled_orders,
          (select coalesce(sum(total),0)::text from orders where status <> 'cancelled') as revenue,
          (select count(*)::text from orders where status = 'pending') as pending,
          (select count(*)::text from customers) as customers,
          (select count(*)::text from product_variants pv join products p on p.id = pv.product_id
            where pv.stock <= p.low_stock_threshold) as low_stock,
          (select count(*)::text from orders where payment_status = 'awaiting_verification') as awaiting_payment`,
  );
  const row = rows[0];
  return {
    ordersTotal: Number(row?.orders_total ?? 0),
    activeOrders: Number(row?.active_orders ?? 0),
    cancelledOrders: Number(row?.cancelled_orders ?? 0),
    revenue: Number(row?.revenue ?? 0),
    pending: Number(row?.pending ?? 0),
    customers: Number(row?.customers ?? 0),
    lowStock: Number(row?.low_stock ?? 0),
    awaitingPayment: Number(row?.awaiting_payment ?? 0),
  };
}

export async function listRecentOrders(limit = 10) {
  return listOrdersForAdmin({ limit });
}/* Daily trend computed live from orders (never from the unwritten
   analytics_daily table). Days before the first real order simply show 0 —
   the honest available range, no fabricated history. */
export async function revenueByDay(days = 14) {
  return rawQuery<{ day: string; orders: number; revenue: number }>(
    sql`select to_char(d.day, 'YYYY-MM-DD') as day,
               count(o.id)::int as orders,
               coalesce(sum(o.total), 0)::int as revenue
          from generate_series(current_date - (${days - 1}::int), current_date, interval '1 day') as d(day)
         left join orders o
                on o.created_at::date = d.day::date
               and o.status <> 'cancelled'
         group by d.day
         order by d.day asc`,
  );
}

export async function topProducts(limit = 8) {
  return rawQuery<{ productId: string; name: string; slug: string; units: number; revenue: number }>(
    sql`select oi.product_id as "productId", coalesce(p.name, oi.product_name) as name,
               coalesce(p.slug, oi.product_slug) as slug,
               sum(oi.quantity)::int as units, sum(oi.line_total)::int as revenue
          from order_items oi
          left join products p on p.id = oi.product_id
         group by oi.product_id, coalesce(p.name, oi.product_name), coalesce(p.slug, oi.product_slug)
         order by units desc limit ${limit}`,
  );
}

export async function listCustomersForAdmin(search?: string) {
  const like = search ? `%${search.trim()}%` : null;
  return rawQuery<{
    id: string;
    email: string;
    fullName: string | null;
    phone: string | null;
    provider: string;
    status: string;
    createdAt: string;
    orderCount: number;
    spend: number;
    avatarUrl: string | null;
  }>(
    sql`select c.id, c.email, c.full_name as "fullName", c.phone, c.provider::text as provider,
               c.status::text as status, c.created_at as "createdAt",
               (select count(*)::int from orders o where o.customer_id = c.id) as "orderCount",
               (select coalesce(sum(total),0)::int from orders o where o.customer_id = c.id and o.status <> 'cancelled') as spend,
               (select '/api/media/' || c.avatar_media_id from media_assets ma where ma.id = c.avatar_media_id) as "avatarUrl"
          from customers c
         where ${like ? sql`(c.email ilike ${like} or coalesce(c.full_name,'') ilike ${like} or coalesce(c.phone,'') ilike ${like})` : sql`true`}
         order by c.created_at desc limit 200`,
  );
}

export async function getCustomerOverview(customerId: string) {
  const rows = await rawQuery<{ orderCount: number; spend: number; pending: number; delivered: number }>(
    sql`select count(*)::int as "orderCount",
               coalesce(sum(total), 0)::int as spend,
               count(*) filter (where status in ('pending','confirmed','processing','shipped'))::int as pending,
               count(*) filter (where status = 'delivered')::int as delivered
          from orders where customer_id = ${customerId}`,
  );
  return rows[0] ?? { orderCount: 0, spend: 0, pending: 0, delivered: 0 };
}

export async function customersWhoOrderedProduct(productId: string) {
  return db
    .selectDistinct({ customerId: orders.customerId, email: orders.email })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(and(eq(orderItems.productId, productId), or(isNull(orders.status), sql`orders.status <> 'cancelled'`)));
}
