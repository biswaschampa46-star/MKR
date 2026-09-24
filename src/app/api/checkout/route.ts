import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { addresses } from "@/db/schema";
import { clearCartToken, getCurrentCustomer } from "@/lib/auth/customer";
import { ensureCartIdentity, readCartIdentity } from "@/lib/auth/identity";
import { getCartView, placeOrder, CheckoutError } from "@/lib/data/commerce";
import { getDeliverySettings, getPaymentSettings } from "@/lib/data/content";
import { checkoutSchema } from "@/lib/validation";
import { zoneForDistrict } from "@/lib/bd-districts";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { ORDER_ACCESS_COOKIE_PREFIX } from "@/lib/orders/access";

export const dynamic = "force-dynamic";

/** Server-computed checkout preview — the client never decides the totals. */
export async function GET() {
  try {
    const identity = await readCartIdentity();
    const [cart, delivery, payments] = await Promise.all([
      getCartView(identity),
      getDeliverySettings(),
      getPaymentSettings(),
    ]);
    return Response.json({ ok: true, cart, delivery, payments });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Unable to load checkout." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const limit = await rateLimit(clientKey(request, "checkout"), 12, 60_000);
  if (!limit.ok) {
    return Response.json({ ok: false, error: "Too many checkout attempts. Please wait a minute." }, { status: 429 });
  }

  const parsed = checkoutSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: "Please review the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const input = parsed.data;

  try {
    const [customer, cart] = await Promise.all([getCurrentCustomer(), readCartIdentity()]);
    const identity = cart ? await ensureCartIdentity() : { customerId: customer?.id ?? null, anonToken: null };
    const view = await getCartView({ customerId: customer?.id ?? null, anonToken: identity.anonToken });

    if (view.lines.length === 0 || !view.id) {
      return Response.json({ ok: false, error: "Your cart is empty." }, { status: 400 });
    }
    const outOfStock = view.lines.find((line) => !line.inStock);
    if (outOfStock) {
      return Response.json(
        { ok: false, error: `Not enough stock for ${outOfStock.name}. Please update your cart.` },
        { status: 409 },
      );
    }

    const zone = input.deliveryZone || zoneForDistrict(input.district);

    const result = await placeOrder({
      cartId: view.id,
      customerId: customer?.id ?? null,
      email: input.email,
      customerName: input.customerName,
      phone: input.phone,
      deliveryZone: zone,
      paymentMethod: input.paymentMethod,
      deliveryPrepaidMethod: input.deliveryPrepaidMethod,
      deliverySenderNumber: input.deliverySenderNumber,
      deliveryTransactionId: input.deliveryTransactionId,
      paymentPurpose: input.paymentMethod === "cod" ? "delivery_prepaid" : "full_prepaid",
      senderNumber: input.senderNumber || null,
      transactionId: input.transactionId || null,
      couponCode: input.couponCode ? input.couponCode.toUpperCase() : null,
      notes: input.notes || null,
      shipping: {
        fullName: input.customerName,
        phone: input.phone,
        addressLine: input.addressLine,
        district: input.district,
        area: input.area || null,
        postalCode: input.postalCode || null,
      },
    });

    if (customer && input.saveAddress) {
      const existing = await db
        .select({ id: addresses.id })
        .from(addresses)
        .where(eq(addresses.customerId, customer.id))
        .limit(1);
      await db.insert(addresses).values({
        customerId: customer.id,
        fullName: input.customerName,
        phone: input.phone,
        addressLine: input.addressLine,
        district: input.district,
        area: input.area || null,
        postalCode: input.postalCode || null,
        isDefault: existing.length === 0,
      });
    }

    const store = await cookies();
    store.set({
      name: `${ORDER_ACCESS_COOKIE_PREFIX}${result.orderId}`,
      value: result.accessToken,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    await clearCartToken();

    return Response.json({
      ok: true,
      orderId: result.orderId,
      orderNumber: result.orderNumber,
      totals: {
        subtotal: result.subtotal,
        discount: result.discount,
        deliveryFee: result.deliveryFee,
        total: result.total,
      },
    });
  } catch (error) {
    if (error instanceof CheckoutError) {
      return Response.json({ ok: false, error: error.message }, { status: 400 });
    }
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "We could not place your order." },
      { status: 500 },
    );
  }
}

/** Recomputes the cart totals from the database for a display refresh. */
export async function PATCH() {
  const identity = await readCartIdentity();
  const cart = await getCartView(identity);
  return Response.json({ ok: true, cart });
}
