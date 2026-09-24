import { db } from "@/db/client";
import { aiGenerations } from "@/db/schema";
import { env } from "@/lib/env";

export const aiConfigured = () => Boolean(env.openRouterKey);

export class AiNotConfiguredError extends Error {
  constructor() {
    super(
      "AI features are not configured. Add OPENROUTER_API_KEY (and optionally OPENROUTER_MODEL / AI_MODELS) on the server.",
    );
    this.name = "AiNotConfiguredError";
  }
}

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export async function runAi(options: {
  kind: "product_description" | "size_recommendation" | "assistant";
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  createdBy?: string | null;
  customerId?: string | null;
}): Promise<{ text: string; model: string }> {
  if (!env.openRouterKey) throw new AiNotConfiguredError();

  const model = options.model ?? env.aiModels[0] ?? env.openRouterModel;
  const baseUrl = env.openRouterBaseUrl.replace(/\/$/, "");

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.openRouterKey}`,
      "HTTP-Referer": env.siteUrl,
      "X-Title": "MKR Storefront",
    },
    body: JSON.stringify({
      model,
      messages: options.messages,
      temperature: options.temperature ?? 0.6,
      max_tokens: 900,
    }),
    signal: AbortSignal.timeout(45_000),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`AI request failed (${response.status}). ${detail.slice(0, 200)}`);
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = payload.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) throw new Error("The AI model returned an empty response.");

  await db.insert(aiGenerations).values({
    kind: options.kind,
    model,
    prompt: options.messages.map((m) => `${m.role}: ${m.content}`).join("\n").slice(0, 6000),
    result: text,
    createdBy: options.createdBy ?? "system",
    customerId: options.customerId ?? null,
  });

  return { text, model };
}

export function productDescriptionMessages(input: {
  name: string;
  category?: string | null;
  material?: string | null;
  fabric?: string | null;
  fit?: string | null;
  gender?: string | null;
  price?: number;
  extra?: string | null;
}): ChatMessage[] {
  return [
    {
      role: "system",
      content:
        "You are a premium fashion copywriter for a Bangladeshi clothing brand named MKR (Casual Threads & Style). Write in a refined, minimal, expensive tone. Return plain text with a 2-3 sentence overview followed by 4-6 short bullet points (each starting with '- ').",
    },
    {
      role: "user",
      content: [
        `Product: ${input.name}`,
        input.category ? `Category: ${input.category}` : "",
        input.material ? `Material: ${input.material}` : "",
        input.fabric ? `Fabric: ${input.fabric}` : "",
        input.fit ? `Fit: ${input.fit}` : "",
        input.gender ? `Audience: ${input.gender}` : "",
        typeof input.price === "number" ? `Price: ${input.price} BDT` : "",
        input.extra ? `Extra notes: ${input.extra}` : "",
        "Write the product description.",
      ]
        .filter(Boolean)
        .join("\n"),
    },
  ];
}

export function sizeRecommendationMessages(input: {
  heightCm: number;
  weightKg: number;
  fit?: string | null;
  availableSizes: string[];
}): ChatMessage[] {
  return [
    {
      role: "system",
      content:
        "You are a sizing assistant for a Bangladeshi clothing brand. Recommend exactly one size from the provided list, then one short sentence of reasoning, then a note if the customer sits between sizes. Never recommend a size that is not in the list.",
    },
    {
      role: "user",
      content: `Height: ${input.heightCm} cm\nWeight: ${input.weightKg} kg\nPreferred fit: ${input.fit ?? "regular"}\nAvailable sizes: ${input.availableSizes.join(", ")}`,
    },
  ];
}

export function assistantMessages(input: { question: string; context?: string | null }): ChatMessage[] {
  return [
    {
      role: "system",
      content:
        "You are the MKR shopping assistant for a premium Bangladeshi clothing store. Help with sizing, fabric, delivery inside Bangladesh, payment (bKash/Nagad/Rocket manual send money or cash on delivery) and returns. Be concise, warm and practical. If you do not know a specific policy, say the team will confirm by phone/email instead of inventing details.",
    },
    {
      role: "user",
      content: input.context ? `${input.context}\n\nCustomer question: ${input.question}` : input.question,
    },
  ];
}
