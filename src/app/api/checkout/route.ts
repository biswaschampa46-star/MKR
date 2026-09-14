import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  orders,
  products,
  coupons,
  couponRedemptions,
  type OrderItem,
  type PaymentPurpose,
} from "@/db/schema";
import { inArray, eq, sql } from "drizzle-orm";
import { getSettings, deliveryFeeFor, isInsideChittagong } from "@/lib/settings";
import { BD_DISTRICTS } from "@/lib/districts";
import { checkCoupon, normalizeCode } from "@/lib/coupons";
import { randomInt } from "crypto";
import { verifyUserToken } from "@/lib/supabase-verify";

const METHODS = new Set(["bkash", "nagad", "rocket"]);
const PURPOSES = new Set<string>(["delivery_charge", "full_order"]);

/* Bangladesh mobile numbers: 01[3-9]XXXXXXXX (11 digits, with optional +88). */
const BD_PHONE = /^(?:\+?88)?01[3-9]\d{8}$/;

type IncomingItem = {
  productId?: string;
  variant?: string;
  qty?: number;
  attributes?: { label?: unknown; value?: unknown }[];
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      phone?: string;
      email?: string;
      address?: string;
      city?: string;
      notes?: string;
      method?: string;
      senderNumber?: string;
      transactionId?: string;
      paymentPurpose?: string;
      couponCode?: string;
      clientRequestId?: string;
      items?: IncomingItem[];
      userId?: string;
      accessToken?: string;
    };

    const name = (body.name ?? "").trim();
    const phone = (body.phone ?? "").trim();
    const email = (body.email ?? "").trim();
    const address = (body.address ?? "").trim();
    const city = (body.city ?? "").trim();
    const notes = (body.notes ?? "").trim();
    const method = (body.method ?? "").trim().toLowerCase();
    const senderNumber = (body.senderNumber ?? "").trim();
    const transactionId = (body.transactionId ?? "").trim();
    const paymentPurpose = (body.paymentPurpose ?? "delivery_charge").trim() as PaymentPurpose;
    const couponCode = (body.couponCode ?? "").trim();
    const clientRequestId = (body.clientRequestId ?? "").trim().slice(0, 64);
    const items = Array.isArray(body.items) ? body.items : [];

    /* ———— customer link: verify the caller's own access token, never
             trust a bare userId. Orders keep working for guests too. ———— */
    let linkedUserId: string | null = null;
    if (body.accessToken || body.userId) {
      const verified = await verifyUserToken(body.accessToken);
      if (!verified.ok || !verified.userId) {
        return fail("Please sign in again before placing your order.");
      }
      if (body.userId && body.userId !== verified.userId) {
        return fail("Your session does not match this account.");
      }
      linkedUserId = verified.userId;
    }

    /* ———— idempotency: a retried submit must not create a second order ———— */
    if (clientRequestId) {
      const [existing] = await db
        .select({ id: orders.id, orderNumber: orders.orderNumber })
        .from(orders)
        .where(inArray(orders.clientRequestId, [clientRequestId]))
        .limit(1);
      if (existing) {
        return NextResponse.json({ ok: true, orderId: existing.id, orderNumber: existing.orderNumber, duplicate: true });
      }
    }

    /* ———— validation ———— */
    if (name.length < 2) return fail("Please enter your full name.");
    if (!BD_PHONE.test(phone.replace(/[\s-]/g, ""))) {
      return fail("Please enter a valid Bangladeshi mobile number (e.g. 01712345678).");
    }
    if (address.length < 4) return fail("Please enter your delivery address.");
    if (!BD_DISTRICTS.some((d) => d.toLowerCase() === city.toLowerCase())) {
      return fail("Please select your district from the list.");
    }
    if (!METHODS.has(method)) {
      return fail("Please choose a payment method: bKash, Nagad or Rocket.");
    }
    if (!PURPOSES.has(paymentPurpose)) return fail("Invalid payment option.");
    if (items.length === 0) return fail("Your cart is empty.");

    /* ———— Bangladesh-only delivery: reject non-BD city input ———— */
    if (/\b(dubai|london|usa|united states|canada|australia|india|pakistan|saudi|uk|europe|malaysia|singapore)\b/i.test(city)) {
      return fail("We deliver inside Bangladesh only.");
    }

    const ids = items
      .map((i) => i.productId)
      .filter((v): v is string => typeof v === "string" && v.length > 8);
    if (ids.length === 0) return fail("Your cart looks out of date. Please refresh and try again.");

    /* ———— recompute everything server-side. Never trust client prices. ———— */
    const dbProducts = await db.select().from(products).where(inArray(products.id, ids));
    const byId = new Map(dbProducts.map((p) => [p.id, p]));

    const orderItems: OrderItem[] = [];
    for (const item of items) {
      if (!item.productId) continue;
      const p = byId.get(item.productId);
      if (!p) {
        return fail(`One of your items is no longer available. Please refresh your cart.`);
      }
      if (p.stock <= 0) {
        return fail(`"${p.name}" is out of stock.`);
      }
      const qty = Math.max(1, Math.min(Math.floor(Number(item.qty) || 1), 99, p.stock));
      const variant = (item.variant ?? "").slice(0, 80) || "Standard";
      /* Optional, labeled selections (Waist Size / Leg Opening) for pant items. */
      let attributes: OrderItem["attributes"];
      if (Array.isArray(item.attributes)) {
        attributes = (item.attributes as { label?: unknown; value?: unknown }[])
          .filter((a) => typeof a?.label === "string" && typeof a?.value === "string")
          .map((a) => ({ label: (a.label as string).trim().slice(0, 40), value: (a.value as string).trim().slice(0, 40) }))
          .filter((a) => a.label && a.value);
      }
      orderItems.push({
        productId: p.id,
        slug: p.slug,
        name: p.name,
        image: p.image,
        variant,
        ...(attributes && attributes.length ? { attributes } : {}),
        price: p.price,
        qty,
      });
    }

    if (orderItems.length === 0) return fail("Your cart is empty.");

    const subtotal = orderItems.reduce((n, i) => n + i.price * i.qty, 0);

    /* ———— delivery charge: server-classified, never client-supplied ———— */
    const storeSettings = await getSettings();
    const insideCtg = isInsideChittagong(city);
    const shippingFee = deliveryFeeFor(city, storeSettings);
    const deliveryZone = insideCtg ? "inside_ctg" : "outside_ctg";

    /* ———— coupon: validated server-side against the real subtotal ———— */
    let discount = 0;
    let appliedCouponCode: string | null = null;
    if (couponCode) {
      const check = await checkCoupon(normalizeCode(couponCode), subtotal, phone);
      if (!check.ok) return fail(check.message);
      discount = check.discount;
      appliedCouponCode = check.coupon.code;
    }

    /* ———— totals ———— */
    const productTotal = Math.max(0, subtotal - discount); // discount can never exceed subtotal
    const grandTotal = productTotal + shippingFee;
    if (grandTotal <= 0) return fail("Order total must be positive.");

    /* ———— payment plan ———— */
    // delivery_charge → pay ONLY the delivery charge now; product is COD.
    // full_order     → pay product total + delivery charge now; COD is 0.
    const amountDueNow = paymentPurpose === "full_order" ? grandTotal : shippingFee;
    const codAmount = paymentPurpose === "full_order" ? 0 : productTotal;

    const orderNumber = `MK-${String(randomInt(100000, 999999))}`;

    const [created] = await db
      .insert(orders)
      .values({
        orderNumber,
        customerName: name.slice(0, 120),
        phone: phone.slice(0, 20),
        email: email ? email.slice(0, 160) : null,
        address,
        city: city.slice(0, 80),
        notes: notes || null,
        paymentMethod: method,
        senderNumber: senderNumber || null,
        transactionId: transactionId || null,
        subtotal,
        shippingFee,
        total: grandTotal,
        discount,
        couponCode: appliedCouponCode,
        deliveryZone,
        paymentPurpose,
        amountPaid: 0, // becomes the paid amount once the store verifies the payment
        codAmount,
        deliveryPaymentStatus: "unpaid", // "paid" only after verification
        productPaymentStatus: paymentPurpose === "full_order" ? "unpaid" : "cod",
        clientRequestId: clientRequestId || null,
        items: orderItems,
        status: "pending_payment", // payments are verified only by the store team
        userId: linkedUserId,
      })
      .returning({ id: orders.id, orderNumber: orders.orderNumber });

    /* ———— record the coupon redemption + bump usage count atomically ———— */
    if (appliedCouponCode && discount > 0) {
      const [couponRow] = await db
        .select({ id: coupons.id })
        .from(coupons)
        .where(eq(coupons.code, appliedCouponCode))
        .limit(1);
      if (couponRow) {
        await db.insert(couponRedemptions).values({
          couponId: couponRow.id,
          orderNumber: created.orderNumber,
          phone: phone.slice(0, 20),
          discountAmount: discount,
        });
        await db
          .update(coupons)
          .set({ usedCount: sql`${coupons.usedCount} + 1` })
          .where(eq(coupons.id, couponRow.id));
      }
    }

    return NextResponse.json({
      ok: true,
      orderId: created.id,
      orderNumber: created.orderNumber,
      total: grandTotal,
      amountDueNow,
      codAmount,
    });
  } catch (err) {
    console.error("checkout failed", err);
    return NextResponse.json(
      { ok: false, message: "We could not place your order. Please try again." },
      { status: 500 },
    );
  }
}

function fail(message: string) {
  return NextResponse.json({ ok: false, message }, { status: 400 });
}
