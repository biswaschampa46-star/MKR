/**
 * Display a cart item / order item's selected options.
 *
 * Items carry both:
 *  - `variant`:  a compact string (e.g. "32 / 17\"") — always populated,
 *                keeps every existing render path working.
 *  - `attributes`: optional [{ label, value }] rows (e.g. Waist Size / Leg Opening)
 *                added for pant/trouser products so admin & customer order
 *                details can show the exact measurements the customer chose.
 *
 * Old orders / non-pant items have no attributes and simply show `variant`.
 */
export type VariantAttribute = { label: string; value: string };

export function variantLabel(item: { variant: string; attributes?: VariantAttribute[] | null }): string {
  const attrs = (item.attributes ?? []).filter((a) => a && a.label && a.value);
  if (attrs.length === 0) return item.variant;
  return attrs.map((a) => `${a.label} ${a.value}`).join(" · ");
}