import { NextResponse } from "next/server";
import { getContactDetails } from "@/lib/contact";

export const dynamic = "force-dynamic";

/**
 * Public read-only contact snapshot — only enabled, non-empty fields.
 * Used by client components (mobile menu). Server components call
 * getContactDetails() directly. No credentials or private data here.
 */
export async function GET() {
  try {
    const contact = await getContactDetails();
    return NextResponse.json(
      { ok: true, contact },
      { headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=300" } },
    );
  } catch (err) {
    console.error("public contact-details fetch failed", err);
    return NextResponse.json({ ok: false, message: "Contact information is unavailable." }, { status: 500 });
  }
}
