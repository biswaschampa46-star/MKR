import { NextResponse } from "next/server";
import { getActivePromotions } from "@/lib/promotions";

export const dynamic = "force-dynamic";

const KNOWN_PLACEMENTS = new Set([
  "announcement",
  "home_top",
  "below_hero",
  "above_products",
  "between_sections",
  "product_page",
  "category_page",
]);

/**
 * Public read of active campaigns for one or more placements. Time-window
 * and enabled filtering happen in SQL; targeting is applied here. Returns
 * an empty list on any database problem — never an error page.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const raw = url.searchParams.get("placements") ?? "";
  const placements = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => KNOWN_PLACEMENTS.has(s))
    .slice(0, 4);

  const productId = url.searchParams.get("productId") ?? undefined;
  const category = url.searchParams.get("category") ?? undefined;

  const campaigns = await getActivePromotions(placements, {
    productId,
    category,
  });

  return NextResponse.json(
    { campaigns },
    { headers: { "cache-control": "no-store" } },
  );
}
