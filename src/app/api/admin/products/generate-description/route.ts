import { NextResponse } from "next/server";
import { isAdmin, unauthorized } from "@/lib/auth";
import { getSettings, parseAiModels } from "@/lib/settings";
import { getRefererUrl, getSiteUrl } from "@/lib/site";

/**
 * Server-side AI product description generator for the admin panel.
 *
 * - API key: OPENROUTER_API_KEY_FOR_ADMINPANEL_PRODUCT (server env only —
 *   it never reaches the browser).
 * - Model: the ONE model already configured for the project AI features
 *   (admin Settings → aiModels, first entry). No fallback, no switching.
 * - The actual product image is sent to the model as a multimodal image input.
 */

const SYSTEM_PROMPT = `You are an expert fashion e-commerce copywriter.

Analyze the provided product image carefully and use the provided product name and available product information.

Write an accurate, attractive, professional product description for an online clothing store.

Only describe details that can reasonably be determined from the image or supplied product information.

Do NOT invent: fabric composition, exact measurements, brand, country of origin, certifications, warranty, technical specifications, or features that cannot be verified.

If a detail cannot be determined, simply do not mention it.

Focus on: what the clothing item appears to be; visible design, color, pattern and style; fit only when reasonably apparent; visible details; suitable general use/occasion when reasonable.

Write naturally for an e-commerce customer. Approximately 80-180 words unless the product information requires otherwise.

Do not mention that AI generated the description.
Do not say "according to the image".
Do not include fake specifications.
Avoid exaggerated marketing claims like "best in the market", "guaranteed quality", "100% premium", "luxury quality".

Return ONLY the product description as plain text.`;

type Body = {
  name?: unknown;
  imageUrl?: unknown;
  info?: Record<string, unknown>;
};

function resolveImageUrl(raw: string): string | null {
  const url = raw.trim();
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (/^\/uploads\//.test(url) || /^\/[^\s]+\.(jpe?g|png|webp|avif|gif)$/i.test(url)) {
    const base = getSiteUrl();
    return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
  }
  return null;
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return unauthorized();

  const apiKey =
    process.env.OPENROUTER_API_KEY_FOR_ADMINPANEL_PRODUCT?.trim() ||
    process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    console.error("product description generation: no OpenRouter API key configured (OPENROUTER_API_KEY_FOR_ADMINPANEL_PRODUCT / OPENROUTER_API_KEY)");
    return NextResponse.json(
      { ok: false, message: "AI description generation is not configured on the server." },
      { status: 500 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim().slice(0, 160) : "";
  if (name.length < 2) {
    return NextResponse.json({ ok: false, message: "Please enter a product name before generating the description." }, { status: 400 });
  }

  const imageUrl = resolveImageUrl(typeof body.imageUrl === "string" ? body.imageUrl : "");
  if (!imageUrl) {
    return NextResponse.json({ ok: false, message: "No product image found. Please upload a product image first." }, { status: 400 });
  }

  /* Additional product info already entered in the form (sanitized into text). */
  const infoLines: string[] = [];
  for (const [key, value] of Object.entries(body.info ?? {}).slice(0, 20)) {
    const safeKey = key.trim().slice(0, 40);
    if (!safeKey) continue;
    if (typeof value === "string" && value.trim()) infoLines.push(`${safeKey}: ${value.trim().slice(0, 120)}`);
    else if (typeof value === "number" && Number.isFinite(value)) infoLines.push(`${safeKey}: ${value}`);
  }

  /* The one configured model — no fallback list, no switching. */
  const settings = await getSettings();
  const model = parseAiModels(settings.aiModels)[0];
  const userText = [
    `PRODUCT NAME: ${name}`,
    infoLines.length > 0 ? `ADDITIONAL PRODUCT INFORMATION:\n${infoLines.join("\n")}` : "",
    "PRODUCT IMAGE: attached to this message.",
    "Write the product description now.",
  ]
    .filter(Boolean)
    .join("\n\n");

  return callOpenRouter(apiKey, settings.aiBaseUrl, model, userText, imageUrl);
}

async function callOpenRouter(
  apiKey: string,
  baseUrl: string,
  model: string,
  userText: string,
  imageUrl: string,
): Promise<NextResponse> {
  try {
    const res = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": getRefererUrl(),
        "X-Title": "Admin Product Description Generator",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        max_tokens: 600,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`product description api error [${model}]`, res.status, errText.slice(0, 300));
      if (res.status === 429) {
        return NextResponse.json(
          { ok: false, message: "The AI service is rate-limited right now. Please try again in a moment." },
          { status: 502 },
        );
      }
      return NextResponse.json({ ok: false, message: "Description generation failed. Please try again." }, { status: 502 });
    }

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    let text = data.choices?.[0]?.message?.content?.trim() ?? "";
    /* strip reasoning blocks some models emit */
    text = text.replace(/<\s*think\s*>[\s\S]*?<\s*\/\s*think\s*>/gi, "").trim();
    if (!text) {
      return NextResponse.json({ ok: false, message: "The model returned an empty description. Please try again." }, { status: 502 });
    }
    return NextResponse.json({ ok: true, text: text.slice(0, 8000), model });
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      return NextResponse.json({ ok: false, message: "The description took too long to generate. Please try again." }, { status: 504 });
    }
    console.error("product description generation failed", err);
    return NextResponse.json({ ok: false, message: "Description generation failed. Please try again." }, { status: 500 });
  }
}
