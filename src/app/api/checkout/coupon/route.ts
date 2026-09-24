import { z } from "zod";
import { getCurrentCustomer } from "@/lib/auth/customer";
import { readCartIdentity } from "@/lib/auth/identity";
import { getCartView, validateCoupon } from "@/lib/data/commerce";
import { getDeliverySettings } from "@/lib/data/content";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const limit = await rateLimit(clientKey(request, "coupon"), 30, 60_000);
  if (!limit.ok) return Response.json({ ok: false, error: "Too many attempts. Try again shortly." }, { status: 429 });

  const parsed = z
    .object({ code: z.string().trim().min(1).max(40), deliveryZone: z.string().trim().max(40).optional() })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, error: "Enter a coupon code." }, { status: 400 });

  try {
    const [customer, identity, delivery] = await Promise.all([
      getCurrentCustomer(),
      readCartIdentity(),
      getDeliverySettings(),
    ]);
    const cart = await getCartView(identity);
    const result = await validateCoupon({
      code: parsed.data.code,
      subtotal: cart.subtotal,
      customerId: customer?.id ?? null,
      email: customer?.email ?? null,
    });

    const zone = delivery.zones.find((z) => z.key === parsed.data.deliveryZone) ?? delivery.zones[0];
    const deliveryFee = zone?.fee ?? 0;
    const total = Math.max(cart.subtotal - (result.valid ? result.discount : 0) + deliveryFee, 0);

    return Response.json({
      ok: true,
      coupon: result,
      totals: {
        subtotal: cart.subtotal,
        discount: result.valid ? result.discount : 0,
        deliveryFee,
        total,
      },
      deliveryZones: delivery.zones,
    });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Coupon validation failed." },
      { status: 500 },
    );
  }
}
