import { z } from "zod";
import { getCurrentCustomer } from "@/lib/auth/customer";
import { listWishlist, toggleWishlist } from "@/lib/data/commerce";

export const dynamic = "force-dynamic";

export async function GET() {
  const customer = await getCurrentCustomer();
  if (!customer) return Response.json({ ok: true, items: [], authenticated: false });
  const items = await listWishlist(customer.id);
  return Response.json({ ok: true, items, authenticated: true });
}

export async function POST(request: Request) {
  const customer = await getCurrentCustomer();
  if (!customer) {
    return Response.json({ ok: false, error: "Sign in to save items to your wishlist." }, { status: 401 });
  }
  const parsed = z.object({ productId: z.string().uuid() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, error: "Invalid product" }, { status: 400 });

  try {
    const result = await toggleWishlist(customer.id, parsed.data.productId);
    const items = await listWishlist(customer.id);
    return Response.json({ ok: true, active: result.active, items });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Unable to update your wishlist." },
      { status: 400 },
    );
  }
}
