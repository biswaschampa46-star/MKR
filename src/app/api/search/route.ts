import { NextResponse } from "next/server";
import { searchProducts } from "@/lib/products";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";

  const result = await searchProducts(q, 6);

  if (!result.ok) {
    console.error("[api/search] database query failed:", result.error);
    return NextResponse.json(
      { ok: false, message: "Search is temporarily unavailable. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, results: result.data });
}
