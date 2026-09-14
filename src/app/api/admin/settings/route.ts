import { NextResponse } from "next/server";
import { isAdmin, unauthorized } from "@/lib/auth";
import { saveSettings } from "@/lib/settings";

/** Admin-editable text settings with per-field length caps. */
const TEXT_LIMITS: Record<string, number> = {
  storeName: 60,
  siteTitle: 200,
  siteTagline: 200,
  bkashNumber: 40,
  nagadNumber: 40,
  rocketNumber: 40,
  aiBaseUrl: 300,
  aiApiKey: 200,
  aiModels: 500,
};

/** Numeric settings (delivery fees). */
const NUMBER_FIELDS = new Set(["deliveryFeeInside", "deliveryFeeOutside"]);

export async function PUT(request: Request) {
  if (!(await isAdmin())) return unauthorized();
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const values: Record<string, string> = {};
    for (const [k, raw] of Object.entries(body)) {
      if (NUMBER_FIELDS.has(k)) {
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0) {
          return NextResponse.json(
            { ok: false, message: "Delivery fees must be non-negative numbers." },
            { status: 400 },
          );
        }
        values[k] = String(Math.floor(n));
        continue;
      }
      const max = TEXT_LIMITS[k];
      if (!max) continue; // ignore unknown keys
      const v = String(raw ?? "").trim();
      if (v.length > max) {
        return NextResponse.json(
          { ok: false, message: `"${k}" is too long (max ${max} characters).` },
          { status: 400 },
        );
      }
      if ((k === "storeName" || k === "siteTitle") && v === "") {
        return NextResponse.json(
          { ok: false, message: "Store name and website title cannot be empty." },
          { status: 400 },
        );
      }
      values[k] = v;
    }
    await saveSettings(values);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin settings save failed", err);
    return NextResponse.json({ ok: false, message: "Could not save settings." }, { status: 500 });
  }
}
