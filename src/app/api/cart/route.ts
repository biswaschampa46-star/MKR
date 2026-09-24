import { z } from "zod";
import { ensureCartIdentity, readCartIdentity } from "@/lib/auth/identity";
import { addCartItem, getCartView, removeCartItem, setCartItemQuantity } from "@/lib/data/commerce";
import { cartItemSchema, cartUpdateSchema } from "@/lib/validation";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const identity = await readCartIdentity();
    const cart = await getCartView(identity);
    return Response.json({ ok: true, cart });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Unable to load your cart." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const limit = await rateLimit(clientKey(request, "cart-add"), 60, 60_000);
  if (!limit.ok) return Response.json({ ok: false, error: "Too many requests. Please slow down." }, { status: 429 });

  const parsed = cartItemSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Invalid cart data", fieldErrors: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const identity = await ensureCartIdentity();
    await addCartItem({
      identity,
      productId: parsed.data.productId,
      variantId: parsed.data.variantId ?? null,
      quantity: parsed.data.quantity,
    });
    const cart = await getCartView(identity);
    return Response.json({ ok: true, cart });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Unable to add this item." },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  const parsed = cartUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Invalid quantity" }, { status: 400 });
  }
  try {
    const identity = await readCartIdentity();
    await setCartItemQuantity(identity, parsed.data.itemId, parsed.data.quantity);
    const cart = await getCartView(identity);
    return Response.json({ ok: true, cart });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Unable to update your cart." },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const parsed = z.object({ itemId: z.string().uuid() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, error: "Invalid item" }, { status: 400 });
  try {
    const identity = await readCartIdentity();
    await removeCartItem(identity, parsed.data.itemId);
    const cart = await getCartView(identity);
    return Response.json({ ok: true, cart });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Unable to remove this item." },
      { status: 400 },
    );
  }
}
