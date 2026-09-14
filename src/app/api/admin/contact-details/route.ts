import { NextResponse } from "next/server";
import { isAdmin, unauthorized } from "@/lib/auth";
import { saveSettings } from "@/lib/settings";
import { isValidEmail, isValidPhone, isValidUrl } from "@/lib/contact-links";

export const dynamic = "force-dynamic";

/** Max lengths for admin-editable contact text fields. */
const TEXT_LIMITS: Record<string, number> = {
  storeName: 60,
  contactPhone: 32,
  contactWhatsapp: 32,
  contactEmail: 160,
  contactSupportEmail: 160,
  contactAddress: 300,
  contactCity: 80,
  contactCountry: 80,
  contactOpeningHours: 160,
  contactSupportHours: 160,
  contactDescription: 300,
  contactFacebook: 300,
  contactInstagram: 300,
  contactTiktok: 300,
  contactYoutube: 300,
  contactTwitter: 300,
};

const FLAG_KEYS = new Set([
  "contactPhoneEnabled",
  "contactWhatsappEnabled",
  "contactEmailEnabled",
  "contactFacebookEnabled",
  "contactInstagramEnabled",
  "contactTiktokEnabled",
  "contactYoutubeEnabled",
  "contactTwitterEnabled",
]);

const URL_KEYS = new Set([
  "contactFacebook",
  "contactInstagram",
  "contactTiktok",
  "contactYoutube",
  "contactTwitter",
]);

function toFlag(raw: unknown): string | null {
  if (typeof raw === "boolean") return raw ? "1" : "0";
  const v = String(raw ?? "").trim().toLowerCase();
  if (["1", "true", "on"].includes(v)) return "1";
  if (["0", "false", "off"].includes(v)) return "0";
  return null;
}

export async function PUT(request: Request) {
  if (!(await isAdmin())) return unauthorized();
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const values: Record<string, string> = {};

    for (const [k, raw] of Object.entries(body)) {
      if (FLAG_KEYS.has(k)) {
        const f = toFlag(raw);
        if (f === null) {
          return NextResponse.json(
            { ok: false, message: `"${k}" must be true or false.` },
            { status: 400 },
          );
        }
        values[k] = f;
        continue;
      }
      const max = TEXT_LIMITS[k];
      if (!max) continue; // ignore unknown keys — never create duplicate records
      const v = String(raw ?? "").trim();
      if (v.length > max) {
        return NextResponse.json(
          { ok: false, message: `"${k}" is too long (max ${max} characters).` },
          { status: 400 },
        );
      }
      if (k === "storeName" && v === "") {
        return NextResponse.json(
          { ok: false, message: "Store name cannot be empty." },
          { status: 400 },
        );
      }
      if (v !== "") {
        if ((k === "contactPhone" || k === "contactWhatsapp") && !isValidPhone(v)) {
          return NextResponse.json(
            { ok: false, message: `"${k}" is not a valid phone number.` },
            { status: 400 },
          );
        }
        if ((k === "contactEmail" || k === "contactSupportEmail") && !isValidEmail(v)) {
          return NextResponse.json(
            { ok: false, message: `"${k}" is not a valid email address.` },
            { status: 400 },
          );
        }
        if (URL_KEYS.has(k) && !isValidUrl(v)) {
          return NextResponse.json(
            { ok: false, message: `"${k}" must be a valid http(s) URL.` },
            { status: 400 },
          );
        }
      }
      values[k] = v;
    }

    await saveSettings(values);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin contact-details save failed", err);
    return NextResponse.json({ ok: false, message: "Could not save contact details." }, { status: 500 });
  }
}
