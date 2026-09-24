"use client";

import { useActionState } from "react";
import { Alert, Button, Field, Input, Textarea } from "@/components/ui";
import { Select } from "@/components/ui/select";
import type { ActionResult } from "@/types";
import {
  saveAboutSectionAction,
  saveContactSettingsAction,
  saveDeliverySettingsAction,
  saveFaqSettingsAction,
  saveHeroSlideAction,
  saveMarketingSettingsAction,
  savePaymentSettingsAction,
  saveMobileHeroImageAction,
  savePeekAssetsAction,
} from "@/app/actions/admin-settings";
import { broadcastNotificationAction, saveCouponAction } from "@/app/actions/admin-community";
import { saveCategoryAction } from "@/app/actions/admin-products";

type State = ActionResult | undefined;

function Shell({ children, title, description }: { children: React.ReactNode; title?: string; description?: string }) {
  return (
    <section className="glass space-y-4 rounded-3xl p-6">
      {title ? <h2 className="font-display text-lg text-[#f4faff]">{title}</h2> : null}
      {description ? <p className="text-xs text-[#a8c0d5]">{description}</p> : null}
      {children}
    </section>
  );
}

function Feedback({ state }: { state: State }) {
  if (!state) return null;
  return state.ok ? <Alert tone="success">{state.message ?? "Saved."}</Alert> : <Alert tone="error">{state.error}</Alert>;
}

export function DeliverySettingsForm({ zones, freeDeliveryThreshold, codEnabled, prepaidDeliveryEnabled }: {
  zones: { key: string; label: string; fee: number }[];
  freeDeliveryThreshold: number | null;
  codEnabled: boolean;
  prepaidDeliveryEnabled: boolean;
}) {
  const [state, formAction, pending] = useActionState(saveDeliverySettingsAction, undefined);
  const rows = zones.length > 0 ? zones : [{ key: "other", label: "Other districts", fee: 130 }];

  return (
    <Shell title="Delivery zones & fees" description="These values are read by checkout — the fee is always recalculated server-side.">
      <form action={formAction} className="space-y-4">
        <div className="space-y-3">
          {rows.map((zone, index) => (
            <div key={index} className="grid gap-3 sm:grid-cols-3">
              <Field label="Zone key">
                <Input name={`zoneKey_${index}`} defaultValue={zone.key} />
              </Field>
              <Field label="Label">
                <Input name={`zoneLabel_${index}`} defaultValue={zone.label} />
              </Field>
              <Field label="Fee (BDT)">
                <Input name={`zoneFee_${index}`} type="number" min={0} defaultValue={zone.fee} />
              </Field>
            </div>
          ))}
        </div>
        <Alert tone="info">
          Add up to 12 zones by keeping the numbered rows. Districts map to a zone key in lib/bd-districts.ts (chittagong / other).
        </Alert>
        <Field label="Free delivery over (BDT)" hint="blank disables free delivery">
          <Input name="freeDeliveryThreshold" type="number" min={0} defaultValue={freeDeliveryThreshold ?? ""} />
        </Field>
        <div className="flex flex-wrap gap-4 text-xs text-[#a8c0d5]">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="codEnabled" defaultChecked={codEnabled} className="h-4 w-4" /> Cash on delivery enabled
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="prepaidDeliveryEnabled" defaultChecked={prepaidDeliveryEnabled} className="h-4 w-4" /> Delivery-charge prepaid enabled
          </label>
        </div>
        <Feedback state={state} />
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save delivery settings"}</Button>
      </form>
    </Shell>
  );
}

export function PaymentSettingsForm({ bkash, nagad, rocket, instructions, source }: {
  bkash: string | null;
  nagad: string | null;
  rocket: string | null;
  instructions: string | null;
  source: string;
}) {
  const [state, formAction, pending] = useActionState(savePaymentSettingsAction, undefined);
  return (
    <Shell title="Mobile payment numbers" description={`Current source: ${source}. Values saved here override the PAYMENT_* environment variables.`}>
      <form action={formAction} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="bKash number"><Input name="bkash" defaultValue={bkash ?? ""} placeholder="01XXXXXXXXX" /></Field>
          <Field label="Nagad number"><Input name="nagad" defaultValue={nagad ?? ""} placeholder="01XXXXXXXXX" /></Field>
          <Field label="Rocket number"><Input name="rocket" defaultValue={rocket ?? ""} placeholder="01XXXXXXXXX" /></Field>
        </div>
        <Field label="Payment instructions shown at checkout">
          <Textarea name="instructions" rows={3} defaultValue={instructions ?? ""} />
        </Field>
        <Feedback state={state} />
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save payment settings"}</Button>
      </form>
    </Shell>
  );
}

export function ContactSettingsForm({ value }: { value: Record<string, string | null> }) {
  const [state, formAction, pending] = useActionState(saveContactSettingsAction, undefined);
  const directFields: { name: string; label: string; hint?: string; placeholder?: string }[] = [
    { name: "email", label: "Support email" },
    { name: "phone", label: "Phone" },
    { name: "whatsapp", label: "WhatsApp number", hint: "shown as text" },
    { name: "address", label: "Studio address" },
    { name: "hours", label: "Opening hours" },
  ];
  const socialFields: { name: string; label: string; hint?: string; placeholder?: string }[] = [
    { name: "instagram", label: "Instagram URL", placeholder: "https://instagram.com/yourbrand" },
    { name: "facebook", label: "Facebook URL", placeholder: "https://facebook.com/yourbrand" },
    {
      name: "whatsappUrl",
      label: "WhatsApp URL",
      hint: "chat link",
      placeholder: "https://wa.me/8801XXXXXXXXX",
    },
  ];
  return (
    <Shell title="Contact details" description="Shown on the contact page, footer and About page structured data — the social URLs also power the floating contact menu on every storefront page.">
      <form action={formAction} className="space-y-6">
        <fieldset className="space-y-4">
          <legend className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8ccbff]">Direct lines &amp; studio</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            {directFields.map((field) => (
              <Field key={field.name} label={field.label} hint={field.hint}>
                <Input name={field.name} defaultValue={value[field.name] ?? ""} placeholder={field.placeholder} />
              </Field>
            ))}
          </div>
        </fieldset>

        {/* Contact / Social Links — the three URLs rendered by the floating
            contact dock. A blank field hides that platform on the storefront
            (no default/fake link is ever generated). */}
        <fieldset className="space-y-4 rounded-2xl border border-[#a8c0d5]/20 p-4">
          <legend className="px-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8ccbff]">
            Contact / Social Links
          </legend>
          <p className="text-xs text-[#a8c0d5]">
            Floating contact menu on every page. Leave a field empty and that option stays hidden until a URL is saved.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {socialFields.map((field) => (
              <Field key={field.name} label={field.label} hint={field.hint}>
                <Input name={field.name} defaultValue={value[field.name] ?? ""} placeholder={field.placeholder} inputMode="url" />
              </Field>
            ))}
          </div>
        </fieldset>

        <Feedback state={state} />
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save contact details"}</Button>
      </form>
    </Shell>
  );
}

export function MarketingSettingsForm({ value }: {
  value: { announcement: string | null; announcementHref: string | null; showAnnouncement: boolean; heroAutoplaySeconds: number; metaTitleSuffix: string };
}) {
  const [state, formAction, pending] = useActionState(saveMarketingSettingsAction, undefined);
  return (
    <Shell title="Storefront announcement & metadata" description="Announcement bar and title suffix used by every page.">
      <form action={formAction} className="space-y-4">
        <Field label="Announcement bar text">
          <Input name="announcement" defaultValue={value.announcement ?? ""} placeholder="Free delivery over ৳3000" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Announcement link"><Input name="announcementHref" defaultValue={value.announcementHref ?? ""} /></Field>
          <Field label="Hero autoplay (seconds)"><Input name="heroAutoplaySeconds" type="number" min={0} max={30} defaultValue={value.heroAutoplaySeconds} /></Field>
          <Field label="Meta title suffix"><Input name="metaTitleSuffix" defaultValue={value.metaTitleSuffix} /></Field>
        </div>
        <label className="flex items-center gap-2 text-xs text-[#a8c0d5]">
          <input type="checkbox" name="showAnnouncement" defaultChecked={value.showAnnouncement} className="h-4 w-4" /> Show the announcement bar
        </label>
        <Feedback state={state} />
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save marketing settings"}</Button>
      </form>
    </Shell>
  );
}

export function FaqSettingsForm({ items }: { items: { question: string; answer: string }[] }) {
  const [state, formAction, pending] = useActionState(saveFaqSettingsAction, undefined);
  const rows = items.length > 0 ? items : [{ question: "", answer: "" }];
  return (
    <Shell title="FAQ entries" description="Rendered on /faq with FAQPage structured data.">
      <form action={formAction} className="space-y-4">
        {rows.map((item, index) => (
          <div key={index} className="space-y-2 rounded-2xl border border-[#a8c0d5]/15 p-3">
            <Input name={`question_${index}`} defaultValue={item.question} placeholder={`Question ${index + 1}`} />
            <Textarea name={`answer_${index}`} rows={3} defaultValue={item.answer} placeholder="Answer" />
          </div>
        ))}
        <Alert tone="info">Add rows by editing an empty row pair — up to 30 entries are supported.</Alert>
        <Feedback state={state} />
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save FAQ"}</Button>
      </form>
    </Shell>
  );
}

export function HeroSlideForm({
  slide,
  desktopMediaId,
  desktopMediaKind = "image",
  mobileMediaUrl,
  mobileMediaId,
  mobileMediaKind = "image",
  mobileAspectRatio = "9:16",
  mobileIsActive = true,
}: {
  slide?: { id: string; eyebrow: string | null; heading: string; subheading: string | null; ctaLabel: string | null; ctaHref: string | null; sortOrder: number; isActive: boolean };
  /* Current media references — posted back as hidden inputs so saving one
     viewport's upload never clears the other viewport's media. */
  desktopMediaId?: string | null;
  desktopMediaKind?: "image" | "video";
  mobileMediaUrl?: string | null;
  mobileMediaId?: string | null;
  mobileMediaKind?: "image" | "video";
  mobileAspectRatio?: string;
  mobileIsActive?: boolean;
}) {
  const [state, formAction, pending] = useActionState(saveHeroSlideAction, undefined);
  return (
    <form action={formAction} className="space-y-4">
      {slide ? <input type="hidden" name="id" value={slide.id} /> : null}
      {desktopMediaId ? <input type="hidden" name="mediaId" value={desktopMediaId} /> : null}
      <input type="hidden" name="mediaType" value={desktopMediaKind} />
      {mobileMediaId ? <input type="hidden" name="mobileMediaId" value={mobileMediaId} /> : null}
      <input type="hidden" name="mobileMediaType" value={mobileMediaKind} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Eyebrow"><Input name="eyebrow" defaultValue={slide?.eyebrow ?? ""} placeholder="New season" /></Field>
        <Field label="Heading" error={state?.ok === false ? state.fieldErrors?.heading?.[0] : undefined}>
          <Input name="heading" required defaultValue={slide?.heading ?? ""} />
        </Field>
        <Field label="Subheading"><Input name="subheading" defaultValue={slide?.subheading ?? ""} /></Field>
        <Field label="CTA label"><Input name="ctaLabel" defaultValue={slide?.ctaLabel ?? ""} /></Field>
        <Field label="CTA link"><Input name="ctaHref" defaultValue={slide?.ctaHref ?? ""} /></Field>
        <Field label="Sort order"><Input name="sortOrder" type="number" defaultValue={slide?.sortOrder ?? 0} /></Field>
      </div>

      <fieldset className="space-y-3 rounded-2xl border border-[#a8c0d5]/20 p-4">
        <legend className="px-2 font-display text-sm text-[#f4faff]">Desktop / tablet hero (16:9)</legend>
        {desktopMediaId && desktopMediaKind === "video" ? (
          <p className="text-xs text-[#8ccbff]">Current desktop media: video</p>
        ) : desktopMediaId ? (
          <p className="text-xs text-[#8ccbff]">Current desktop media: image</p>
        ) : null}
        <Field label="Desktop media" hint="image or video → Supabase Storage (uploads bucket)">
          <input type="file" name="file" accept="image/*,video/*" className="w-full rounded-2xl border border-[#a8c0d5]/25 bg-[#071a2b]/70 px-4 py-3 text-sm text-[#ddf3ff] file:mr-3 file:rounded-full file:border-0 file:bg-[#8ccbff]/20 file:px-3 file:py-1.5" />
        </Field>
        <label className="flex items-center gap-2 text-xs text-[#a8c0d5]">
          <input type="checkbox" name="isActive" defaultChecked={slide?.isActive ?? true} className="h-4 w-4" /> Active on desktop &amp; tablet
        </label>
      </fieldset>

      <fieldset className="space-y-3 rounded-2xl border border-[#a8c0d5]/20 p-4">
        <legend className="px-2 font-display text-sm text-[#f4faff]">Mobile hero (phones only)</legend>
        {mobileMediaUrl ? (
          mobileMediaKind === "video" ? (
            <video src={mobileMediaUrl} className="max-h-48 w-auto rounded-xl object-contain" muted controls playsInline />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mobileMediaUrl} alt="Mobile hero media" className="max-h-48 w-auto rounded-xl object-contain" />
          )
        ) : (
          <p className="text-xs text-[#a8c0d5]">No mobile media — phones fall back to the desktop hero.</p>
        )}
        <Field label="Mobile media" hint="portrait video/image · MP4/WEBM up to 60 MB">
          <input type="file" name="mobileFile" accept="image/*,video/*" className="w-full rounded-2xl border border-[#a8c0d5]/25 bg-[#071a2b]/70 px-4 py-3 text-sm text-[#ddf3ff] file:mr-3 file:rounded-full file:border-0 file:bg-[#8ccbff]/20 file:px-3 file:py-1.5" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mobile aspect ratio" hint="how phones compose the hero">
            <Select name="mobileAspectRatio" defaultValue={["9:16", "2:3", "4:5", "1:1"].includes(mobileAspectRatio) ? mobileAspectRatio : "9:16"}>
              {["9:16", "2:3", "4:5", "1:1"].map((ratio) => (
                <option key={ratio} value={ratio}>{ratio}</option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-xs text-[#a8c0d5]">
              <input type="checkbox" name="mobileIsActive" defaultChecked={mobileIsActive} className="h-4 w-4" /> Enable mobile media
            </label>
          </div>
        </div>
        {slide ? (
          <label className="flex items-center gap-2 text-xs text-[#a8c0d5]">
            <input type="checkbox" name="removeMobile" value="1" className="h-4 w-4" /> Remove current mobile media
          </label>
        ) : null}
      </fieldset>

      <Feedback state={state} />
      <Button type="submit" disabled={pending}>{pending ? "Uploading…" : slide ? "Update slide" : "Add hero slide"}</Button>
    </form>
  );
}

export function PeekAssetsForm({ value }: { value: { leftLeadUrl: string | null; leftFollowUrl: string | null; leftShirtUrl: string | null; rightLeadUrl: string | null; rightFollowUrl: string | null; rightShirtUrl: string | null } }) {
  const [state, formAction, pending] = useActionState(savePeekAssetsAction, undefined);
  const groups = [
    {
      title: "Left edge stack (desktop & tablet)",
      hint: "Peeks from the left viewport edge; on phones these images are used for the centered dock.",
      slots: [
        { name: "leftLeadFile", label: "Lead image (enters first)", current: value.leftLeadUrl, fallback: "/brand/baggy-jeans-dark.png" },
        { name: "leftFollowFile", label: "Follow image (trails in)", current: value.leftFollowUrl, fallback: "/brand/baggy-jeans.png" },
        { name: "leftShirtFile", label: "Shirt image (lingers last)", current: value.leftShirtUrl, fallback: "/brand/mkr-shirt-black.png" },
      ],
    },
    {
      title: "Right edge stack (desktop & tablet)",
      hint: "Mirrored twin that peeks from the right viewport edge at the same time — pick different garments for a framed look.",
      slots: [
        { name: "rightLeadFile", label: "Lead image (enters first)", current: value.rightLeadUrl, fallback: "same as left lead" },
        { name: "rightFollowFile", label: "Follow image (trails in)", current: value.rightFollowUrl, fallback: "same as left follow" },
        { name: "rightShirtFile", label: "Shirt image (lingers last)", current: value.rightShirtUrl, fallback: "same as left shirt" },
      ],
    },
  ];
  return (
    <Shell
      title="Floating product peek"
      description="The homepage scroll animation floats garment cutouts over the brand statement — one stack on each viewport edge (desktop/tablet), centered on phones. Transparent PNGs work best. Leave a slot empty to keep the current image."
    >
      <form action={formAction} className="space-y-6">
        {groups.map((group) => (
          <fieldset key={group.title} className="space-y-3 rounded-2xl border border-[#a8c0d5]/20 p-4">
            <legend className="px-2 font-display text-sm text-[#f4faff]">{group.title}</legend>
            <p className="text-xs text-[#a8c0d5]">{group.hint}</p>
            {group.slots.map((slot) => (
              <div key={slot.name} className="space-y-2 rounded-2xl border border-[#a8c0d5]/15 p-4">
                <p className="text-sm font-medium text-[#f4faff]">{slot.label}</p>
                {slot.current ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={slot.current} alt="" className="h-24 w-24 rounded-xl object-contain" />
                ) : (
                  <p className="text-xs text-[#a8c0d5]">Using default: {slot.fallback}</p>
                )}
                <input
                  type="file"
                  name={slot.name}
                  accept="image/png,image/webp,image/svg+xml"
                  className="w-full rounded-2xl border border-[#a8c0d5]/25 bg-[#071a2b]/70 px-4 py-3 text-sm text-[#ddf3ff] file:mr-3 file:rounded-full file:border-0 file:bg-[#8ccbff]/20 file:px-3 file:py-1.5"
                />
              </div>
            ))}
          </fieldset>
        ))}
        <Feedback state={state} />
        <Button type="submit" disabled={pending}>{pending ? "Uploading…" : "Save peek images"}</Button>
      </form>
    </Shell>
  );
}

/* Mobile Hero Image — ONE image, used only on phones. Desktop peek animation
   stays untouched. Replaces (not mixes with) any previous upload. */
export function MobileHeroImageForm({ value }: { value: { url: string | null; altText: string | null } }) {
  const [state, formAction, pending] = useActionState(saveMobileHeroImageAction, undefined);
  return (
    <Shell
      title="Mobile Hero Image"
      description="A single garment shot shown only on mobile devices, in place of the floating peek composition. Phones never render the desktop shirt + pants animation."
    >
      <form action={formAction} className="space-y-4">
        <div className="space-y-2 rounded-2xl border border-[#a8c0d5]/15 p-4">
          <p className="text-sm font-medium text-[#f4faff]">Current image</p>
          {value.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value.url} alt="Mobile hero image" className="max-h-56 w-auto rounded-xl object-contain" />
          ) : (
            <p className="text-xs text-[#a8c0d5]">
              No mobile hero image set — phones show a clean static hero (navy gradient + type).
            </p>
          )}
        </div>
        <Field label="Upload / Replace image" hint="Portrait or square works best · PNG/WebP/JPG · max 8 MB">
          <input
            type="file"
            name="mobileHeroFile"
            accept="image/png,image/jpeg,image/webp,image/avif"
            className="w-full rounded-2xl border border-[#a8c0d5]/25 bg-[#071a2b]/70 px-4 py-3 text-sm text-[#ddf3ff] file:mr-3 file:rounded-full file:border-0 file:bg-[#8ccbff]/20 file:px-3 file:py-1.5"
          />
        </Field>
        <p className="text-xs text-[#a8c0d5]">
          Used only on mobile devices. Desktop hero animation remains unchanged.
        </p>
        <Feedback state={state} />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending}>{pending ? "Uploading…" : value.url ? "Replace image" : "Upload image"}</Button>
          {value.url ? (
            <button
              type="submit"
              name="remove"
              value="1"
              disabled={pending}
              className="rounded-full border border-[#a8c0d5]/25 px-4 py-2 text-xs text-[#a8c0d5] transition-colors duration-300 hover:border-[#8ccbff]/50 hover:text-[#8ccbff] disabled:opacity-50"
            >
              Remove image
            </button>
          ) : null}
        </div>
      </form>
    </Shell>
  );
}

export function AboutSectionForm({ section }: { section?: { id: string; section: string; heading: string; body: string | null; sortOrder: number; isActive: boolean } }) {
  const [state, formAction, pending] = useActionState(saveAboutSectionAction, undefined);
  return (
    <form action={formAction} className="space-y-4">
      {section ? <input type="hidden" name="id" value={section.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Section key">
          <Select name="section" defaultValue={section?.section ?? "story"}>
            <option value="story">story</option>
            <option value="craft">craft</option>
            <option value="fabric">fabric</option>
            <option value="sustainability">sustainability</option>
            <option value="team">team</option>
          </Select>
        </Field>
        <Field label="Heading" error={state?.ok === false ? state.fieldErrors?.heading?.[0] : undefined}>
          <Input name="heading" required defaultValue={section?.heading ?? ""} />
        </Field>
      </div>
      <Field label="Body"><Textarea name="body" rows={4} defaultValue={section?.body ?? ""} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Sort order"><Input name="sortOrder" type="number" defaultValue={section?.sortOrder ?? 0} /></Field>
        <Field label="Section media" hint="image or video">
          <input type="file" name="file" accept="image/*,video/*" className="w-full rounded-2xl border border-[#a8c0d5]/25 bg-[#071a2b]/70 px-4 py-3 text-sm text-[#ddf3ff] file:mr-3 file:rounded-full file:border-0 file:bg-[#8ccbff]/20 file:px-3 file:py-1.5" />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-xs text-[#a8c0d5]">
        <input type="checkbox" name="isActive" defaultChecked={section?.isActive ?? true} className="h-4 w-4" /> Active
      </label>
      <Feedback state={state} />
      <Button type="submit" disabled={pending}>{pending ? "Uploading…" : section ? "Update section" : "Add section"}</Button>
    </form>
  );
}

export function CouponForm() {
  const [state, formAction, pending] = useActionState(saveCouponAction, undefined);
  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Code" error={state?.ok === false ? state.fieldErrors?.code?.[0] : undefined}>
          <Input name="code" required placeholder="MKR10" />
        </Field>
        <Field label="Type">
          <Select name="discountType" defaultValue="percentage">
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed amount</option>
          </Select>
        </Field>
        <Field label="Value" error={state?.ok === false ? state.fieldErrors?.discountValue?.[0] : undefined}>
          <Input name="discountValue" type="number" min={1} required placeholder="10" />
        </Field>
        <Field label="Min order (BDT)"><Input name="minOrderAmount" type="number" min={0} defaultValue={0} /></Field>
        <Field label="Max discount (BDT)" hint="percentage caps"><Input name="maxDiscountAmount" type="number" min={0} /></Field>
        <Field label="Usage limit" hint="blank = unlimited"><Input name="usageLimit" type="number" min={0} /></Field>
        <Field label="Per user limit"><Input name="perUserLimit" type="number" min={1} defaultValue={1} /></Field>
        <Field label="Starts at"><Input name="startsAt" type="datetime-local" /></Field>
        <Field label="Expires at"><Input name="expiresAt" type="datetime-local" /></Field>
      </div>
      <Field label="Description"><Input name="description" placeholder="Eid campaign 10% off" /></Field>
      <label className="flex items-center gap-2 text-xs text-[#a8c0d5]">
        <input type="checkbox" name="isActive" defaultChecked className="h-4 w-4" /> Active
      </label>
      <Feedback state={state} />
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Create coupon"}</Button>
    </form>
  );
}

export function CategoryForm() {
  const [state, formAction, pending] = useActionState(saveCategoryAction, undefined);
  const fieldErrors = state?.ok === false ? state.fieldErrors : undefined;
  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" error={fieldErrors?.name?.[0]}>
          <Input name="name" required placeholder="Shirts" />
        </Field>
        <Field label="Slug" hint="auto from name if empty" error={fieldErrors?.slug?.[0]}>
          <Input name="slug" placeholder="shirts" />
        </Field>
        <Field label="Sort order" error={fieldErrors?.sortOrder?.[0]}><Input name="sortOrder" type="number" min={0} defaultValue={0} /></Field>
        <Field label="Description" error={fieldErrors?.description?.[0]}><Input name="description" /></Field>
      </div>
      <label className="flex items-center gap-2 text-xs text-[#a8c0d5]">
        <input type="checkbox" name="isActive" defaultChecked className="h-4 w-4" /> Active
      </label>
      <Feedback state={state} />
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save category"}</Button>
    </form>
  );
}

export function BroadcastNotificationForm({ customers }: { customers: { id: string; email: string }[] }) {
  const [state, formAction, pending] = useActionState(broadcastNotificationAction, undefined);
  return (
    <form action={formAction} className="space-y-4">
      <Field label="Title"><Input name="title" required placeholder="Eid delivery schedule" /></Field>
      <Field label="Body"><Textarea name="body" rows={3} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Link" hint="optional in-app path"><Input name="link" placeholder="/shop" /></Field>
        <Field label="Kind">
          <Select name="kind" defaultValue="info">
            <option value="info">info</option>
            <option value="promo">promo</option>
            <option value="order">order</option>
            <option value="payment">payment</option>
          </Select>
        </Field>
      </div>
      <Field label="Customer" hint="ignored when broadcasting">
        <Select name="customerId" defaultValue="">
          <option value="">— none —</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>{customer.email}</option>
          ))}
        </Select>
      </Field>
      <label className="flex items-center gap-2 text-xs text-[#a8c0d5]">
        <input type="checkbox" name="broadcastAll" className="h-4 w-4" /> Broadcast to every customer
      </label>
      <Feedback state={state} />
      <Button type="submit" disabled={pending}>{pending ? "Sending…" : "Send notification"}</Button>
    </form>
  );
}
