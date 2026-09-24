import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { products } from "@/db/schema";
import { getAdminSession } from "@/lib/auth/admin";
import { getCurrentCustomer } from "@/lib/auth/customer";
import {
  AiNotConfiguredError,
  aiConfigured,
  assistantMessages,
  productDescriptionMessages,
  runAi,
  sizeRecommendationMessages,
} from "@/lib/ai";
import { getProductById, listProducts } from "@/lib/data/catalog";
import { getSetting } from "@/lib/data/content";
import {
  SETTINGS_KEY,
  isPantsProduct,
  recommendSize,
  type BodyType,
  type SizeRecommendationSettings,
} from "@/lib/size-engine";
import { env } from "@/lib/env";
import { aiAssistSchema } from "@/lib/validation";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    ok: true,
    configured: aiConfigured(),
    models: env.aiModels.length > 0 ? env.aiModels : [env.openRouterModel],
  });
}

export async function POST(request: Request) {
  const limit = await rateLimit(clientKey(request, "ai"), 20, 60_000);
  if (!limit.ok) return Response.json({ ok: false, error: "Too many AI requests. Please wait a moment." }, { status: 429 });

  if (!aiConfigured()) {
    return Response.json(
      {
        ok: false,
        error:
          "AI is not configured on this server. Add OPENROUTER_API_KEY (and optionally AI_MODELS / OPENROUTER_MODEL) to enable it.",
      },
      { status: 503 },
    );
  }

  const parsed = aiAssistSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, error: "Invalid AI request." }, { status: 400 });
  const input = parsed.data;

  try {
    if (input.kind === "product_description") {
      const admin = await getAdminSession();
      if (!admin) return Response.json({ ok: false, error: "Admin session required." }, { status: 401 });

      const product = input.productId ? await getProductById(input.productId) : null;
      const row = input.productId
        ? (await db.select().from(products).where(eq(products.id, input.productId)).limit(1))[0]
        : null;

      const result = await runAi({
        kind: "product_description",
        messages: productDescriptionMessages({
          name: product?.name ?? input.prompt.slice(0, 120),
          category: product?.categoryName ?? null,
          material: product?.material ?? null,
          fabric: product?.fabric ?? null,
          fit: product?.fit ?? null,
          gender: product?.gender ?? null,
          price: product?.price ?? (row ? Number(row.price) : undefined),
          extra: input.prompt,
        }),
        createdBy: `admin:${admin.subject}`,
      });
      return Response.json({ ok: true, text: result.text, model: result.model });
    }

    if (input.kind === "size_recommendation") {
      if (!input.productId || !input.height || !input.weight) {
        return Response.json({ ok: false, error: "Height, weight and a product are required." }, { status: 400 });
      }
      const product = await getProductById(input.productId);
      const sizes = product?.variants.filter((v) => v.isActive && v.size).map((v) => v.size!) ?? [];
      const uniqueSizes = Array.from(new Set(sizes));
      if (uniqueSizes.length === 0) {
        return Response.json({ ok: false, error: "This product does not have a size chart yet." }, { status: 400 });
      }

      /* Phase 14 — deterministic engine decides the size; AI may only
         embellish the wording. Admin toggle can disable the deterministic
         path entirely (settings key `size_recommendation.enabled`). */
      const settings = await getSetting<SizeRecommendationSettings>(SETTINGS_KEY, { enabled: true });
      if (!settings.enabled) {
        return Response.json({ ok: false, error: "Size recommendations are currently unavailable." }, { status: 503 });
      }

      const bodyType: BodyType =
        input.bodyType === "slim" || input.bodyType === "fat" || input.bodyType === "regular"
          ? input.bodyType
          : "regular";
      const pantsEligible = product ? isPantsProduct({ categoryName: product.categoryName, name: product.name }) : false;
      const recommendation = recommendSize(
        {
          age: input.age ?? 30,
          heightCm: input.height,
          weightKg: input.weight,
          bodyType,
        },
        {
          pantsEligible,
          pants: {
            waistInches: input.waistInches ?? undefined,
            legOpeningInches: input.legOpeningInches ?? undefined,
          },
        },
      );

      // Keep the size inside the product's actual available sizes when possible.
      const availableTop = uniqueSizes.find((s) => s.toUpperCase() === recommendation.top) ?? uniqueSizes.find((s) => s.toUpperCase() === (recommendation.confidence === "low" && recommendation.betweenSizes ? recommendation.betweenSizes[1] : recommendation.top));
      const chosenSize = availableTop ?? recommendation.top;

      const deterministicText = [
        `Recommended size: ${chosenSize}.`,
        recommendation.confidence === "low" && recommendation.betweenSizes
          ? `You sit between ${recommendation.betweenSizes.join(" and ")} — ${chosenSize} leans toward the comfortable side.`
          : "",
        ...recommendation.notes,
      ].filter(Boolean).join(" ");

      // AI enrichment is best-effort; the deterministic answer always ships.
      if (aiConfigured()) {
        try {
          const result = await runAi({
            kind: "size_recommendation",
            messages: sizeRecommendationMessages({
              heightCm: input.height,
              weightKg: input.weight,
              fit: product?.fit ?? null,
              availableSizes: uniqueSizes,
            }),
            temperature: 0.3,
          });
          return Response.json({ ok: true, text: `${deterministicText} ${result.text}`, model: result.model, size: chosenSize });
        } catch {
          // fall through to deterministic-only answer
        }
      }
      return Response.json({ ok: true, text: deterministicText, model: "deterministic", size: chosenSize });
    }

    // storefront assistant — grounded in live catalogue data
    const matches = await listProducts({ search: input.prompt, perPage: 4 });
    const context =
      matches.items.length > 0
        ? `Relevant catalogue items: ${matches.items
            .map((item) => `${item.name} (${item.price} BDT, ${item.categoryName ?? "MKR"})`)
            .join("; ")}`
        : null;
    const customer = await getCurrentCustomer();
    const result = await runAi({
      kind: "assistant",
      messages: assistantMessages({ question: input.prompt, context }),
      customerId: customer?.id ?? null,
    });
    return Response.json({ ok: true, text: result.text, model: result.model, suggestions: matches.items.map((i) => ({ name: i.name, slug: i.slug })) });
  } catch (error) {
    if (error instanceof AiNotConfiguredError) {
      return Response.json({ ok: false, error: error.message }, { status: 503 });
    }
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "The AI request failed." },
      { status: 502 },
    );
  }
}
