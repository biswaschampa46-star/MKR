import { NextResponse } from "next/server";
import { db } from "@/db";
import { products, effectiveVariants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSettings, parseAiModels } from "@/lib/settings";
import {
  findSizeGroup,
  normalizeCustomerInput,
  recommendSize,
  sortSizes,
  looksLikeClothingSize,
} from "@/lib/sizing";

/**
 * "Find My Size" — secure recommendation endpoint.
 *
 * The customer's measurements are posted here, validated, used for ONE AI
 * call (SAME provider/base-url/key/model the existing /api/assistant and
 * description-generator routes use via admin Settings) and never persisted
 * or logged. The API key stays server-side.
 *
 * The AI's answer is strictly validated; any failure (invalid JSON, missing
 * size, unavailable size, timeout, rate limit, server error) falls back to
 * the local engine so the customer always gets an available-size estimate.
 */

const AI_TIMEOUT_MS = 15000;

/* naive per-IP rate limit: 12 requests / 10 min (mirrors /api/assistant) */
const hits = new Map<string, { n: number; reset: number }>();

const CONFIDENCES = ["high", "good", "moderate"] as const;
type Confidence = (typeof CONFIDENCES)[number];

const SYSTEM_PROMPT = `You are a clothing-size recommendation assistant for an online clothing store.
You receive a product's available sizes and a customer's age, height (cm), weight (kg) and self-described body type.
Rules:
- Choose the single best size STRICTLY from "availableSizes". NEVER invent, reformat or assume any size not in that list.
- Base the choice mainly on height + weight + body build. Age is only a low-weight secondary hint — never let it dominate.
- "Slim" may tip a genuinely borderline case toward the smaller size; "Broad"/"Fuller" may tip a borderline case toward the larger one; "Regular" uses the baseline fit. Never jump more than one size because of body type alone.
- This is an ESTIMATE, not a certainty. Never claim a guaranteed or 100% accurate fit. Do not compute, mention or display BMI.
- Write one short, warm reason (max 25 words) phrased as an estimate, e.g. "Recommended based on the information you provided." Never say "guaranteed", "definitely", or "100%".
Respond with STRICT JSON only — no markdown, no commentary:
{"recommendedSize":"<one of availableSizes>","confidence":"high|good|moderate","reason":"<short estimate wording>"}`;

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

/** Extract the first JSON object from a model reply (handles ```json fences + reasoning blocks). */
function parseAiJson(raw: string): { recommendedSize?: unknown; confidence?: unknown; reason?: unknown } | null {
  const clean = raw.replace(/<\s*think\s*>[\s\S]*?<\s*\/\s*think\s*>/gi, "");
  const fenced = clean.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : clean).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(candidate.slice(start, end + 1));
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  /* rate limit first — cost control */
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const rec = hits.get(ip);
  if (rec && rec.reset > now && rec.n >= 12) {
    return json({ ok: false, source: "none", message: "Too many requests. Please wait a moment." }, 429);
  }
  if (!rec || rec.reset <= now) hits.set(ip, { n: 1, reset: now + 10 * 60 * 1000 });
  else rec.n += 1;

  /* validate payload */
  let body: { productId?: unknown; sizeGroup?: unknown; customer?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ ok: false, source: "none", message: "Invalid request." }, 400);
  }

  const productId = typeof body.productId === "string" ? body.productId.trim() : "";
  if (!productId) return json({ ok: false, source: "none", message: "Product is required." }, 400);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId)) {
    return json({ ok: false, source: "none", message: "Product not found." }, 404);
  }

  /* load the product — the server decides available sizes, never the client */
  const rows = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  const product = rows[0];
  if (!product) return json({ ok: false, source: "none", message: "Product not found." }, 404);
  if (!product.sizeRecommendationEnabled) {
    return json({ ok: false, source: "none", message: "Size recommendation is not enabled for this product." }, 403);
  }

  const sizeGroup = findSizeGroup(effectiveVariants(product));
  if (!sizeGroup) return json({ ok: false, source: "none", message: "This product has no clothing sizes." }, 400);

  const availableSizes = sizeGroup.options.filter((s) => looksLikeClothingSize(s));
  if (availableSizes.length === 0) {
    return json({ ok: false, source: "none", message: "This product has no clothing sizes." }, 400);
  }
  const sortedSizes = sortSizes(availableSizes);

  /* Fast path: a single available size (e.g. "Free Size") needs no AI call,
     no customer data, and no estimate — the answer is the size itself. */
  if (sortedSizes.length === 1) {
    const only = sortedSizes[0];
    return json({
      ok: true,
      source: "direct",
      recommendedSize: only,
      confidence: "high",
      reason: `This product is available in a single size (${only}).`,
      availableSizes: sortedSizes,
    });
  }

  /* validate customer input */
  const input = normalizeCustomerInput(body.customer ?? {});
  if (!input.ok) return json({ ok: false, source: "none", message: input.message }, 400);
  const customer = input.value;

  /* ---- AI call — SAME configuration the existing assistant route uses ---- */
  const userPayload = {
    productName: product.name,
    productCategory: product.category || product.clothingType || "clothing",
    availableSizes: sortedSizes,
    customer: {
      age: customer.age,
      heightCm: customer.heightCm,
      weightKg: customer.weightKg,
      bodyType: customer.bodyType,
    },
  };

  let aiAnswer: { recommendedSize: string; confidence: Confidence; reason: string } | null = null;

  const settings = await getSettings();
  const apiKey = settings.aiApiKey;
  const model = parseAiModels(settings.aiModels)[0];

  if (apiKey && model) {
    try {
      const res = await fetch(settings.aiBaseUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": process.env.SITE_URL?.trim() || "http://localhost:3000",
          "X-Title": "MKR Find My Size",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: JSON.stringify(userPayload) },
          ],
          temperature: 0.3,
          max_tokens: 220,
          reasoning: { enabled: false },
        }),
        signal: AbortSignal.timeout(AI_TIMEOUT_MS),
      });

      if (res.ok) {
        const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
        const raw = data.choices?.[0]?.message?.content ?? "";
        const parsed = parseAiJson(raw);
        if (parsed) {
          const size = typeof parsed.recommendedSize === "string" ? parsed.recommendedSize.trim() : "";
          const conf = parsed.confidence;
          const reason = typeof parsed.reason === "string" ? parsed.reason.trim() : "";
          const exact = sortedSizes.find((s) => s.toLowerCase() === size.toLowerCase());
          const validConf = CONFIDENCES.includes(conf as Confidence) ? (conf as Confidence) : "good";
          if (exact) {
            aiAnswer = {
              recommendedSize: exact, // always the catalog's exact spelling
              confidence: validConf,
              reason: reason.replace(/\s+/g, " ").slice(0, 200),
            };
          } else {
            console.error("size-recommendation: AI returned an unavailable size");
          }
        } else {
          console.error("size-recommendation: AI returned invalid JSON");
        }
      } else {
        console.error("size-recommendation: AI api error", res.status);
      }
    } catch (err) {
      console.error("size-recommendation: AI request failed", err instanceof Error ? err.name : err);
    }
  }

  /* ---- fallback: local estimate whenever the AI path failed ---- */
  const fallbackSize = recommendSize({ ...customer, availableSizes: sortedSizes });

  if (aiAnswer) {
    return json({
      ok: true,
      source: "ai",
      recommendedSize: aiAnswer.recommendedSize,
      confidence: aiAnswer.confidence,
      reason: aiAnswer.reason,
      availableSizes: sortedSizes,
    });
  }

  if (!fallbackSize) {
    return json({ ok: false, source: "none", message: "No sizes available to recommend." }, 422);
  }

  return json({
    ok: true,
    source: "fallback",
    recommendedSize: fallbackSize,
    confidence: "moderate",
    reason: "Estimated locally from your details using our standard sizing guide.",
    availableSizes: sortedSizes,
  });
}
