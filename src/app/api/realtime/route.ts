import { getAdminSession } from "@/lib/auth/admin";
import { getCurrentCustomer } from "@/lib/auth/customer";
import { fetchRealtimeEvents, type RealtimeEvent } from "@/lib/realtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ADMIN_CHANNELS = new Set(["orders", "inventory", "products", "messages"]);
const CUSTOMER_CHANNELS = new Set(["notifications", "orders"]);

/**
 * Durable Server-Sent Events feed over the realtime_events table. Used when
 * Supabase Realtime is not configured; the payloads are identical so the UI
 * layer never changes.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const channel = url.searchParams.get("channel") ?? "orders";
  const headerLastId = Number(request.headers.get("last-event-id") ?? "0");
  const sinceParam = Number(url.searchParams.get("since") ?? "0");
  let lastId = Number.isFinite(headerLastId) && headerLastId > 0 ? headerLastId : Number.isFinite(sinceParam) ? sinceParam : 0;

  if (ADMIN_CHANNELS.has(channel)) {
    const admin = await getAdminSession();
    if (!admin) return new Response("Unauthorized", { status: 401 });
  } else if (CUSTOMER_CHANNELS.has(channel)) {
    const customer = await getCurrentCustomer();
    const admin = await getAdminSession();
    if (!customer && !admin) return new Response("Unauthorized", { status: 401 });
  } else {
    return new Response("Unknown channel", { status: 400 });
  }

  const encoder = new TextEncoder();
  let closed = false;
  const startedAt = Date.now();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: RealtimeEvent) => {
        controller.enqueue(
          encoder.encode(
            `id: ${event.id}\nevent: ${event.event}\ndata: ${JSON.stringify({
              id: event.id,
              channel: event.channel,
              event: event.event,
              payload: event.payload ?? {},
              createdAt: event.createdAt,
            })}\n\n`,
          ),
        );
      };

      controller.enqueue(encoder.encode(`: connected to ${channel}\n\n`));

      while (!closed && Date.now() - startedAt < 5 * 60 * 1000) {
        try {
          const events = await fetchRealtimeEvents(channel, lastId, 50);
          for (const event of events) {
            lastId = Math.max(lastId, Number(event.id));
            send(event);
          }
          controller.enqueue(encoder.encode(`: ping ${Date.now()}\n\n`));
        } catch {
          controller.enqueue(encoder.encode(`event: stream.error\ndata: {"message":"temporary data error"}\n\n`));
        }
        await new Promise((resolve) => setTimeout(resolve, 4000));
      }

      try {
        controller.close();
      } catch {
        /* already closed */
      }
    },
    cancel() {
      closed = true;
    },
  });

  request.signal.addEventListener("abort", () => {
    closed = true;
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
