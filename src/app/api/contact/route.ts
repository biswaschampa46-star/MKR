import { db } from "@/db/client";
import { contactMessages } from "@/db/schema";
import { getCurrentCustomer } from "@/lib/auth/customer";
import { createNotification } from "@/lib/data/content";
import { publishRealtimeEvent } from "@/lib/realtime";
import { contactSchema } from "@/lib/validation";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const limit = await rateLimit(clientKey(request, "contact"), 6, 60_000);
  if (!limit.ok) return Response.json({ ok: false, error: "Too many messages. Please try again later." }, { status: 429 });

  const parsed = contactSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: "Please review the form.", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const customer = await getCurrentCustomer();
    const input = parsed.data;
    const [inserted] = await db
      .insert(contactMessages)
      .values({
        name: input.name,
        email: input.email,
        phone: input.phone || null,
        subject: input.subject || null,
        message: input.message,
        customerId: customer?.id ?? null,
      })
      .returning({ id: contactMessages.id });

    await createNotification({
      customerId: null,
      audience: "admin",
      kind: "info",
      title: `New contact message from ${input.name}`,
      body: input.subject || input.message.slice(0, 140),
      link: "/admin/messages",
    });
    await publishRealtimeEvent("messages", "message.created", { id: inserted.id, name: input.name });

    return Response.json({ ok: true, message: "Thanks — our team will get back to you shortly." });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Your message could not be sent." },
      { status: 500 },
    );
  }
}
