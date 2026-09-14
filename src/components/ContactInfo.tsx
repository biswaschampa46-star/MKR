import { Phone, Mail, MapPin, Clock, Headset } from "lucide-react";
import { telHref } from "@/lib/contact-links";
import type { PublicContact } from "@/lib/contact";
import { SOCIAL_ICONS, WhatsappIcon } from "./ContactIcons";

/**
 * Shared public contact renderers — Footer, Contact page and mobile menu all
 * use these so icons, links and empty-hiding behavior stay identical.
 * Nothing renders for empty/disabled values (no orphan icons, no "null").
 */

const rowCls =
  "group flex items-center gap-3 text-sm text-mist transition-colors duration-300 hover:text-ice";
const iconCls =
  "grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line-soft bg-white/[0.04] text-soft transition-all duration-300 group-hover:scale-110 group-hover:border-soft/40 group-hover:text-ice";

export function ContactMethodList({ contact }: { contact: PublicContact }) {
  const rows: React.ReactNode[] = [];

  if (contact.phone) {
    rows.push(
      <a key="phone" href={telHref(contact.phone)} aria-label={`Call ${contact.storeName} at ${contact.phone}`} className={rowCls}>
        <span className={iconCls}><Phone className="h-4 w-4" strokeWidth={1.8} /></span>
        <span>{contact.phone}</span>
      </a>,
    );
  }
  if (contact.whatsapp && contact.whatsappHref) {
    rows.push(
      <a
        key="whatsapp"
        href={contact.whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Chat with ${contact.storeName} on WhatsApp`}
        className={rowCls}
      >
        <span className={iconCls}><WhatsappIcon size={16} /></span>
        <span>WhatsApp: {contact.whatsapp}</span>
      </a>,
    );
  }
  if (contact.email) {
    rows.push(
      <a key="email" href={`mailto:${contact.email}`} aria-label={`Email ${contact.storeName} at ${contact.email}`} className={rowCls}>
        <span className={iconCls}><Mail className="h-4 w-4" strokeWidth={1.8} /></span>
        <span className="break-all">{contact.email}</span>
      </a>,
    );
  }
  if (contact.supportEmail && contact.supportEmail !== contact.email) {
    rows.push(
      <a key="support" href={`mailto:${contact.supportEmail}`} aria-label={`Email support at ${contact.supportEmail}`} className={rowCls}>
        <span className={iconCls}><Headset className="h-4 w-4" strokeWidth={1.8} /></span>
        <span className="break-all">{contact.supportEmail}</span>
      </a>,
    );
  }
  if (contact.address) {
    rows.push(
      <p key="address" className={rowCls}>
        <span className={iconCls}><MapPin className="h-4 w-4" strokeWidth={1.8} /></span>
        <span>{contact.address}</span>
      </p>,
    );
  }
  if (contact.openingHours) {
    rows.push(
      <p key="hours" className={rowCls}>
        <span className={iconCls}><Clock className="h-4 w-4" strokeWidth={1.8} /></span>
        <span>{contact.openingHours}</span>
      </p>,
    );
  }

  if (rows.length === 0) return null;
  return (
    <address className="space-y-3.5 not-italic" itemScope itemType="https://schema.org/Organization">
      <meta itemProp="name" content={contact.storeName} />
      {contact.phone && <meta itemProp="telephone" content={contact.phone} />}
      {contact.email && <meta itemProp="email" content={contact.email} />}
      {rows}
    </address>
  );
}

export function SocialIconRow({ contact, compact = false }: { contact: PublicContact; compact?: boolean }) {
  if (contact.socials.length === 0) return null;
  const box = compact ? "h-9 w-9" : "h-10 w-10";
  return (
    <div className="flex flex-wrap items-center gap-2.5" role="list" aria-label="Social media links">
      {contact.socials.map((s) => {
        const Icon = SOCIAL_ICONS[s.key];
        return (
          <a
            key={s.key}
            role="listitem"
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${contact.storeName} on ${s.label}`}
            title={s.label}
            className={`grid ${box} place-items-center rounded-full border border-line-soft bg-white/[0.04] text-mist transition-all duration-300 hover:scale-110 hover:border-soft/40 hover:text-ice focus-visible:outline-2`}
          >
            <Icon size={16} />
          </a>
        );
      })}
    </div>
  );
}
