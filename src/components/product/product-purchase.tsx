"use client";

import { useMemo, useState } from "react";
import { Minus, Plus, Ruler, Sparkles } from "lucide-react";
import { Alert, Button, Field, Input } from "@/components/ui";
import { Select } from "@/components/ui/select";
import { MediaImage } from "@/components/media-image";
import { useCart } from "@/components/cart/cart-provider";
import type { ProductDetail } from "@/types";

export function ProductPurchase({ product }: { product: ProductDetail }) {
  const { addItem, pending } = useCart();
  const [selectedSize, setSelectedSize] = useState<string | null>(product.variants[0]?.size ?? null);
  const [selectedColor, setSelectedColor] = useState<string | null>(product.variants[0]?.color ?? null);
  const [quantity, setQuantity] = useState(1);
  const [feedback, setFeedback] = useState<{ tone: "info" | "success" | "error"; text: string } | null>(null);
  const [sizeOpen, setSizeOpen] = useState(false);
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [age, setAge] = useState("");
  const [bodyType, setBodyType] = useState<"regular" | "slim" | "fat">("regular");
  const [waistInches, setWaistInches] = useState("");
  const [legOpeningInches, setLegOpeningInches] = useState("");
  const [aiPending, setAiPending] = useState(false);
  const pantsEligible = /\b(pants|jeans|trousers|denim)\b/i.test(`${product.categoryName ?? ""} ${product.name}`);
  // Phase 16 — admin-uploaded size-chart media (product_images.role = size_chart).
  const sizeChartImages = product.images.filter((image) => image.role === "size_chart");
  const [chartOpen, setChartOpen] = useState(false);

  const sizes = useMemo(() => Array.from(new Set(product.variants.map((v) => v.size).filter(Boolean))) as string[], [product.variants]);
  const colors = useMemo(() => Array.from(new Set(product.variants.map((v) => v.color).filter(Boolean))) as string[], [product.variants]);

  const hasVariants = product.variants.length > 0;
  const matchingVariant = hasVariants
    ? product.variants.find(
        (variant) =>
          (sizes.length === 0 || variant.size === selectedSize) && (colors.length === 0 || variant.color === selectedColor),
      )
    : null;

  const availableStock = hasVariants ? (matchingVariant?.stock ?? 0) : product.stock;
  const activePrice = matchingVariant?.price ?? product.price;
  const canAdd = availableStock > 0 && (!hasVariants || Boolean(matchingVariant));

  const handleAdd = async () => {
    if (!canAdd) {
      setFeedback({ tone: "error", text: "That combination is out of stock." });
      return;
    }
    const result = await addItem({
      productId: product.id,
      variantId: matchingVariant?.id ?? null,
      quantity,
    });
    setFeedback(
      result.ok
        ? { tone: "success", text: "Added to your cart." }
        : { tone: "error", text: result.error ?? "Could not add this item." },
    );
  };

  const requestSize = async () => {
    if (!height || !weight) {
      setFeedback({ tone: "error", text: "Enter your height and weight first." });
      return;
    }
    setAiPending(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "size_recommendation",
          productId: product.id,
          prompt: `Height ${height} cm, weight ${weight} kg, ${bodyType} build`,
          height: Number(height),
          weight: Number(weight),
          ...(age ? { age: Number(age) } : {}),
          bodyType,
          ...(waistInches ? { waistInches: Number(waistInches) } : {}),
          ...(legOpeningInches ? { legOpeningInches: Number(legOpeningInches) } : {}),
        }),
      });
      const payload = (await response.json()) as { ok: boolean; text?: string; error?: string };
      if (!payload.ok) throw new Error(payload.error ?? "Size recommendation unavailable.");
      setFeedback({ tone: "info", text: payload.text ?? "" });
    } catch (cause) {
      setFeedback({ tone: "error", text: cause instanceof Error ? cause.message : "Size recommendation unavailable." });
    } finally {
      setAiPending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {sizes.length > 0 ? (
          <div>
            <p className="meta-label-muted mb-2">Size</p>
            <div className="flex flex-wrap gap-2">
              {sizes.map((size) => {
                const variant = product.variants.find((v) => v.size === size && (colors.length === 0 || v.color === selectedColor));
                const disabled = !variant || variant.stock <= 0;
                return (
                  <button
                    key={size}
                    type="button"
                    disabled={disabled}
                    onClick={() => setSelectedSize(size)}
                    className={`min-w-12 rounded-xl border px-4 py-2 text-sm transition-all duration-300 ${
                      selectedSize === size
                        ? "border-[#8ccbff]/70 bg-[#8ccbff]/10 text-[#f4faff]"
                        : "border-[#a8c0d5]/20 text-[#ddf3ff] hover:border-[#8ccbff]/50"
                    } ${disabled ? "cursor-not-allowed opacity-40 line-through" : ""}`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {colors.length > 0 ? (
          <div>
            <p className="meta-label-muted mb-2">Colour</p>
            <div className="flex flex-wrap gap-2">
              {colors.map((color) => {
                const variant = product.variants.find((v) => v.color === color && (sizes.length === 0 || v.size === selectedSize));
                const disabled = !variant || variant.stock <= 0;
                return (
                  <button
                    key={color}
                    type="button"
                    disabled={disabled}
                    onClick={() => setSelectedColor(color)}
                    className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm transition-all duration-300 ${
                      selectedColor === color
                        ? "border-[#8ccbff]/70 bg-[#8ccbff]/10 text-[#f4faff]"
                        : "border-[#a8c0d5]/20 text-[#ddf3ff] hover:border-[#8ccbff]/50"
                    } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
                  >
                    <span
                      className="h-3.5 w-3.5 rounded-full border border-[#a8c0d5]/40"
                      style={{ background: variant?.colorHex ?? "#0e2f4a" }}
                    />
                    {color}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <div className="hairline-t flex flex-wrap items-center gap-4 pt-5">
        <div className="flex items-center gap-1 rounded-xl border border-[#a8c0d5]/20 px-1.5">
          <button type="button" aria-label="Decrease quantity" onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="rounded-full p-2 text-[#ddf3ff]">
            <Minus className="h-4 w-4" />
          </button>
          <span className="min-w-8 text-center text-sm">{quantity}</span>
          <button
            type="button"
            aria-label="Increase quantity"
            onClick={() => setQuantity((q) => Math.min(Math.max(availableStock, 1), q + 1))}
            className="rounded-full p-2 text-[#ddf3ff]"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <p className="meta-label-muted">
          {availableStock > 0 ? (
            <>
              <span className="text-[#f4faff]">{availableStock}</span> in stock
              {matchingVariant ? ` · ৳${activePrice.toLocaleString("en-BD")}` : ""}
            </>
          ) : (
            "Out of stock"
          )}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button size="lg" onClick={() => void handleAdd()} disabled={pending || !canAdd} className="flex-1">
          {pending ? "Adding…" : canAdd ? "Add to cart" : "Unavailable"}
        </Button>
        <Button size="lg" variant="outline" onClick={() => setSizeOpen((open) => !open)} aria-expanded={sizeOpen} aria-controls="size-help-panel" className="sm:w-auto">
          <Ruler className="h-4 w-4" /> Size help
        </Button>
        {sizeChartImages.length > 0 ? (
          <Button size="lg" variant="ghost" onClick={() => setChartOpen((open) => !open)} aria-expanded={chartOpen} aria-controls="size-chart-panel" className="sm:w-auto">
            <Ruler className="h-4 w-4" /> Size chart
          </Button>
        ) : null}
      </div>

      {/* Phase 16 — size-chart media, mobile-friendly, lazy, no layout shift
          (aspect ratio preserved by the media wrapper). */}
      {chartOpen && sizeChartImages.length > 0 ? (
        <div id="size-chart-panel" className="mkr-panel glass space-y-3 rounded-3xl p-5">
          <h3 className="font-display text-base text-[#f4faff]">Size chart</h3>
          {sizeChartImages.map((image) =>
            image.kind === "video" ? (
              <video key={image.id} src={image.publicUrl} controls playsInline className="w-full rounded-2xl" />
            ) : (
              <MediaImage
                key={image.id}
                src={image.publicUrl}
                alt={image.altText ?? `${product.name} size chart`}
                className="aspect-[4/5] w-full rounded-2xl"
                sizes="(max-width: 768px) 100vw, 40vw"
              />
            ),
          )}
        </div>
      ) : null}

      {feedback ? <Alert tone={feedback.tone === "success" ? "success" : feedback.tone === "error" ? "error" : "info"}>{feedback.text}</Alert> : null}

      {sizeOpen ? (
        <div id="size-help-panel" className="mkr-panel glass space-y-4 rounded-3xl p-5">
          <div className="flex items-center gap-2 text-sm text-[#ddf3ff]">
            <Sparkles className="h-4 w-4 text-[#8ccbff]" /> Size recommendation
          </div>
          <p className="text-[11px] text-[#a8c0d5]/80">
            A store sizing helper — not a body assessment. Answers come from our own size rules.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Height (cm)">
              <Input inputMode="numeric" value={height} onChange={(event) => setHeight(event.target.value)} placeholder="175" />
            </Field>
            <Field label="Weight (kg)">
              <Input inputMode="numeric" value={weight} onChange={(event) => setWeight(event.target.value)} placeholder="72" />
            </Field>
            <Field label="Age (years)" hint="optional">
              <Input inputMode="numeric" value={age} onChange={(event) => setAge(event.target.value)} placeholder="28" />
            </Field>
            <Field label="Body type">
              <Select
                value={bodyType}
                onChange={(event) => setBodyType(event.target.value as "regular" | "slim" | "fat")}
                aria-label="Body type"
              >
                <option value="slim">Slim</option>
                <option value="regular">Regular</option>
                <option value="fat">Relaxed / broad</option>
              </Select>
            </Field>
            {pantsEligible ? (
              <>
                <Field label="Waist (inches)" hint="optional · 28–35">
                  <Input inputMode="numeric" value={waistInches} onChange={(event) => setWaistInches(event.target.value)} placeholder="32" />
                </Field>
                <Field label="Leg opening (inches)" hint="optional · 15–22">
                  <Input inputMode="numeric" value={legOpeningInches} onChange={(event) => setLegOpeningInches(event.target.value)} placeholder="18" />
                </Field>
              </>
            ) : null}
          </div>
          <Button type="button" variant="outline" onClick={() => void requestSize()} disabled={aiPending}>
            {aiPending ? "Analysing…" : "Recommend my size"}
          </Button>
          {product.sizeChart.length > 0 ? (
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              {product.sizeChart.map((row) => (
                <div key={row.label} className="flex items-center justify-between rounded-2xl border border-[#a8c0d5]/15 px-3 py-2">
                  <dt className="text-[#a8c0d5]">{row.label}</dt>
                  <dd className="text-[#f4faff]">{row.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-xs text-[#a8c0d5]">No size chart published for this piece yet.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
