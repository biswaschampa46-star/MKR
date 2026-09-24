import { z } from "zod";
import { findOrderForTracking, getOrderDetail } from "@/lib/data/commerce";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { ORDER_STATUS_LABELS } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const limit = await rateLimit(clientKey(request, "track"), 20, 60_000);
  if (!limit.ok) return Response.json({ ok: false, error: "Too many lookups. Try again shortly." }, { status: 429 });

  const parsed = z
    .object({
      orderNumber: z.string().trim().min(4).max(20),
      identifier: z.string().trim().min(5).max(180),
    })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Enter your order number and the email or phone used at checkout." }, { status: 400 });
  }

  const match = await findOrderForTracking(parsed.data.orderNumber, parsed.data.identifier);
  if (!match) {
    return Response.json(
      { ok: false, error: "No order matches that number and contact detail. Use the exact email or phone from checkout." },
      { status: 404 },
    );
  }

  const detail = await getOrderDetail(match.id);
  if (!detail) return Response.json({ ok: false, error: "Order details are unavailable right now." }, { status: 500 });

  return Response.json({
    ok: true,
    order: {
      orderNumber: detail.orderNumber,
      status: detail.status,
      statusLabel: ORDER_STATUS_LABELS[detail.status] ?? detail.status,
      paymentStatus: detail.paymentStatus,
      createdAt: detail.createdAt,
      total: detail.total,
      deliveryZone: detail.deliveryZone,
      items: detail.items.map((item) => ({
        productName: item.productName,
        productSlug: item.productSlug,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      })),
      events: detail.events.map((event) => ({
        status: event.status,
        message: event.message,
        createdAt: event.createdAt,
      })),
    },
  });
}
