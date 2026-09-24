import { subscribeEmail } from "@/lib/data/content";
import { subscribeSchema } from "@/lib/validation";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const limit = await rateLimit(clientKey(request, "newsletter"), 10, 60_000);
  if (!limit.ok) return Response.json({ ok: false, error: "Too many attempts. Try again later." }, { status: 429 });

  const parsed = subscribeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, error: "Enter a valid email address." }, { status: 400 });

  try {
    await subscribeEmail(parsed.data.email, parsed.data.source ?? "footer");
    return Response.json({ ok: true, message: "You are on the list. Welcome to MKR." });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Subscription failed." },
      { status: 500 },
    );
  }
}
