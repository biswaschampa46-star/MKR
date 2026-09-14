import { getSettings, type StoreSettings } from "@/lib/settings";
import {
  SOCIAL_LABELS,
  whatsappHref,
  type PublicContact,
  type SocialKey,
} from "@/lib/contact-links";

export type { PublicContact, SocialKey };
export { SOCIAL_LABELS };

const nonEmpty = (v: string): string | null => {
  const t = (v ?? "").trim();
  return t ? t : null;
};

export function toPublicContact(s: StoreSettings): PublicContact {
  const phone = s.contactPhoneEnabled ? nonEmpty(s.contactPhone) : null;
  const whatsappRaw = s.contactWhatsappEnabled ? nonEmpty(s.contactWhatsapp) : null;
  const email = s.contactEmailEnabled ? nonEmpty(s.contactEmail) : null;
  const supportEmail = s.contactEmailEnabled ? nonEmpty(s.contactSupportEmail) : null;

  const addressParts = [nonEmpty(s.contactAddress), nonEmpty(s.contactCity), nonEmpty(s.contactCountry)].filter(
    Boolean,
  ) as string[];

  const socialDefs: { key: SocialKey; value: string; enabled: boolean }[] = [
    { key: "facebook", value: s.contactFacebook, enabled: s.contactFacebookEnabled },
    { key: "instagram", value: s.contactInstagram, enabled: s.contactInstagramEnabled },
    { key: "tiktok", value: s.contactTiktok, enabled: s.contactTiktokEnabled },
    { key: "youtube", value: s.contactYoutube, enabled: s.contactYoutubeEnabled },
    { key: "twitter", value: s.contactTwitter, enabled: s.contactTwitterEnabled },
  ];
  const socials = socialDefs
    .filter((d) => d.enabled && nonEmpty(d.value))
    .map((d) => ({ key: d.key, label: SOCIAL_LABELS[d.key], href: d.value.trim() }));

  return {
    storeName: s.storeName,
    description: nonEmpty(s.contactDescription) ?? "",
    phone,
    whatsapp: whatsappRaw,
    whatsappHref: whatsappRaw ? whatsappHref(whatsappRaw) : null,
    email,
    supportEmail,
    address: addressParts.length > 0 ? addressParts.join(", ") : null,
    city: nonEmpty(s.contactCity),
    country: nonEmpty(s.contactCountry),
    openingHours: nonEmpty(s.contactOpeningHours),
    supportHours: nonEmpty(s.contactSupportHours),
    socials,
  };
}

/** Server-side: latest admin-saved contact info (request-memoized via getSettings). */
export async function getContactDetails(): Promise<PublicContact> {
  return toPublicContact(await getSettings());
}

/** True when at least one contact channel is publicly visible. */
export function hasAnyContact(c: PublicContact): boolean {
  return Boolean(
    c.phone || c.whatsapp || c.email || c.supportEmail || c.address || c.socials.length > 0,
  );
}
