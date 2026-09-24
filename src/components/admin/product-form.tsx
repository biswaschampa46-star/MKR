"use client";

import { useActionState, useState } from "react";
import { Sparkles } from "lucide-react";
import { Alert, Button, Field, Input, Textarea } from "@/components/ui";
import { Select } from "@/components/ui/select";
import { saveProductAction } from "@/app/actions/admin-products";
import type { ProductDetail } from "@/types";

type VariantRow = {
  id?: string;
  sku: string;
  size: string;
  color: string;
  colorHex: string;
  price: string;
  stock: string;
  isActive: string;
};

const emptyVariant = (index: number): VariantRow => ({
  sku: `MKR-V${index + 1}`,
  size: "",
  color: "",
  colorHex: "",
  price: "",
  stock: "0",
  isActive: "true",
});

export function ProductForm({
  product,
  categories,
}: {
  product: ProductDetail | null;
  categories: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(saveProductAction, undefined);
  const [variants, setVariants] = useState<VariantRow[]>(
    product && product.variants.length > 0
      ? product.variants.map((variant) => ({
          id: variant.id,
          sku: variant.sku,
          size: variant.size ?? "",
          color: variant.color ?? "",
          colorHex: variant.colorHex ?? "",
          price: variant.price ? String(variant.price) : "",
          stock: String(variant.stock),
          isActive: variant.isActive ? "true" : "false",
        }))
      : [emptyVariant(0)],
  );
  const [description, setDescription] = useState(product?.description ?? "");
  const [aiPending, setAiPending] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [sizeChartText, setSizeChartText] = useState(
    JSON.stringify(product?.sizeChart ?? [{ label: "Chest", value: "40 in" }], null, 0),
  );

  const generateCopy = async () => {
    setAiPending(true);
    setAiMessage(null);
    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "product_description",
          productId: product?.id ?? null,
          prompt: `${product?.name ?? "New MKR piece"} — ${description.slice(0, 400)}`,
        }),
      });
      const payload = (await response.json()) as { ok: boolean; text?: string; error?: string };
      if (!payload.ok) throw new Error(payload.error ?? "AI generation failed.");
      setDescription(payload.text ?? "");
      setAiMessage("AI draft inserted — review before publishing.");
    } catch (cause) {
      setAiMessage(cause instanceof Error ? cause.message : "AI generation failed.");
    } finally {
      setAiPending(false);
    }
  };

  return (
    <form action={formAction} className="space-y-6">
      {product ? <input type="hidden" name="id" value={product.id} /> : null}
      <input type="hidden" name="variants" value={JSON.stringify(variants)} />
      <input type="hidden" name="sizeChart" value={sizeChartText} />

      <section className="glass space-y-4 rounded-3xl p-6">
        <h2 className="font-display text-lg text-[#f4faff]">Basics</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" error={state?.ok === false ? state.fieldErrors?.name?.[0] : undefined}>
            <Input name="name" required defaultValue={product?.name ?? ""} />
          </Field>
          <Field label="Slug" hint="auto from name if empty" error={state?.ok === false ? state.fieldErrors?.slug?.[0] : undefined}>
            <Input name="slug" defaultValue={product?.slug ?? ""} placeholder="oversized-linen-shirt" />
          </Field>
          <Field label="Brand">
            <Input name="brand" defaultValue={product?.brand ?? "MKR"} />
          </Field>
          <Field label="SKU" error={state?.ok === false ? state.fieldErrors?.sku?.[0] : undefined}>
            <Input name="sku" required defaultValue={product?.sku ?? ""} placeholder="MKR-OS-001" />
          </Field>
          <Field label="Category">
            <Select name="categoryId" defaultValue={""} key={product?.categoryName ?? "none"}>
              <option value="">Uncategorised</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Subcategory">
            <Input name="subcategory" defaultValue={product?.subcategory ?? ""} />
          </Field>
          <Field label="Price (BDT)">
            <Input name="price" type="number" min={0} required defaultValue={product?.price ?? ""} />
          </Field>
          <Field label="Compare price (BDT)" hint="optional">
            <Input name="comparePrice" type="number" min={0} defaultValue={product?.comparePrice ?? ""} />
          </Field>
          <Field label="Status">
            <Select name="status" defaultValue={product?.status ?? "draft"}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </Select>
          </Field>
          <Field label="Visibility">
            <Select name="visibility" defaultValue={product?.visibility ?? "public"}>
              <option value="public">Public</option>
              <option value="hidden">Hidden</option>
            </Select>
          </Field>
          <Field label="Base stock" hint="used when no variants exist">
            <Input name="stock" type="number" min={0} defaultValue={product?.stock ?? 0} />
          </Field>
          <Field label="Low stock alert at">
            <Input name="lowStockThreshold" type="number" min={0} defaultValue={3} />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-xs text-[#a8c0d5]">
          <input type="checkbox" name="isFeatured" defaultChecked={product?.isFeatured ?? false} className="h-4 w-4" />
          Feature this product on the homepage
        </label>
      </section>

      <section className="glass space-y-4 rounded-3xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg text-[#f4faff]">Copy &amp; details</h2>
          <Button type="button" variant="outline" size="sm" onClick={() => void generateCopy()} disabled={aiPending}>
            <Sparkles className="h-4 w-4" /> {aiPending ? "Generating…" : "AI draft description"}
          </Button>
        </div>
        {aiMessage ? <Alert tone="info">{aiMessage}</Alert> : null}
        <Field label="Short description" hint="max 300 chars">
          <Textarea name="shortDescription" rows={2} defaultValue={product?.shortDescription ?? ""} />
        </Field>
        <Field label="Description">
          <Textarea name="description" rows={6} value={description} onChange={(event) => setDescription(event.target.value)} />
        </Field>
        <Field label="Rich content" hint="markdown-style long copy">
          <Textarea name="richContent" rows={4} defaultValue={product?.richContent ?? ""} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Material">
            <Input name="material" defaultValue={product?.material ?? ""} />
          </Field>
          <Field label="Fabric">
            <Input name="fabric" defaultValue={product?.fabric ?? ""} />
          </Field>
          <Field label="Fit">
            <Input name="fit" defaultValue={product?.fit ?? ""} />
          </Field>
          <Field label="Audience">
            <Input name="gender" defaultValue={product?.gender ?? ""} placeholder="Men / Women / Unisex" />
          </Field>
          <Field label="Sizes" hint="comma separated">
            <Input name="sizes" defaultValue={(product?.sizes ?? []).join(", ")} />
          </Field>
          <Field label="Colours" hint="comma separated">
            <Input name="colors" defaultValue={(product?.colors ?? []).join(", ")} />
          </Field>
          <Field label="Tags" hint="comma separated">
            <Input name="tags" defaultValue={(product?.tags ?? []).join(", ")} />
          </Field>
          <Field label="SEO keywords" hint="comma separated">
            <Input name="keywords" defaultValue={(product?.keywords ?? []).join(", ")} />
          </Field>
        </div>
        <Field label="Size chart" hint='JSON rows: [{"label":"Chest","value":"40 in"}]'>
          <Textarea rows={3} value={sizeChartText} onChange={(event) => setSizeChartText(event.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Care instructions">
            <Textarea name="careInstructions" rows={3} defaultValue={product?.careInstructions ?? ""} />
          </Field>
          <Field label="Shipping information">
            <Textarea name="shippingInformation" rows={3} defaultValue={product?.shippingInformation ?? ""} />
          </Field>
          <Field label="SEO title">
            <Input name="seoTitle" defaultValue={product?.seoTitle ?? ""} />
          </Field>
          <Field label="SEO description">
            <Textarea name="seoDescription" rows={3} defaultValue={product?.seoDescription ?? ""} />
          </Field>
        </div>
      </section>

      <section className="glass space-y-4 rounded-3xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg text-[#f4faff]">Variants &amp; inventory</h2>
          <Button type="button" variant="outline" size="sm" onClick={() => setVariants((rows) => [...rows, emptyVariant(rows.length)])}>
            Add variant
          </Button>
        </div>
        <div className="space-y-3">
          {variants.map((variant, index) => (
            <div key={variant.id ?? `new-${index}`} className="grid gap-3 rounded-2xl border border-[#a8c0d5]/15 p-3 sm:grid-cols-7">
              <Input
                value={variant.sku}
                onChange={(event) => setVariants((rows) => rows.map((row, i) => (i === index ? { ...row, sku: event.target.value } : row)))}
                placeholder="SKU"
              />
              <Input
                value={variant.size}
                onChange={(event) => setVariants((rows) => rows.map((row, i) => (i === index ? { ...row, size: event.target.value } : row)))}
                placeholder="Size"
              />
              <Input
                value={variant.color}
                onChange={(event) => setVariants((rows) => rows.map((row, i) => (i === index ? { ...row, color: event.target.value } : row)))}
                placeholder="Colour"
              />
              <Input
                value={variant.colorHex}
                onChange={(event) => setVariants((rows) => rows.map((row, i) => (i === index ? { ...row, colorHex: event.target.value } : row)))}
                placeholder="#0e2f4a"
              />
              <Input
                value={variant.price}
                onChange={(event) => setVariants((rows) => rows.map((row, i) => (i === index ? { ...row, price: event.target.value } : row)))}
                placeholder="Price"
                type="number"
                min={0}
              />
              <Input
                value={variant.stock}
                onChange={(event) => setVariants((rows) => rows.map((row, i) => (i === index ? { ...row, stock: event.target.value } : row)))}
                placeholder="Stock"
                type="number"
                min={0}
              />
              <Button type="button" variant="danger" size="sm" onClick={() => setVariants((rows) => rows.filter((_, i) => i !== index))}>
                Remove
              </Button>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-[#a8c0d5]">Variant stock is authoritative at checkout — the product total is recalculated automatically.</p>
      </section>

      {state && !state.ok ? <Alert tone="error">{state.error}</Alert> : null}
      {state && state.ok ? <Alert tone="success">{state.message}</Alert> : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Saving…" : product ? "Save product" : "Create product"}
        </Button>
      </div>
    </form>
  );
}
