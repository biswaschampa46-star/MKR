import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { getContactDetails, hasAnyContact } from "@/lib/contact";
import { ContactMethodList, SocialIconRow } from "./ContactInfo";
import Reveal from "./Reveal";

export default async function Footer() {
  /* Live store identity & delivery fees from admin Settings. */
  const s = await getSettings();
  /* Live contact info from Admin → Contact Details (enabled + non-empty only). */
  const contact = await getContactDetails();
  const showContact = hasAnyContact(contact);
  const locationLine = contact.address ?? "Dhaka, Bangladesh";

  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: contact.storeName,
    ...(contact.email ? { email: contact.email } : {}),
    ...(contact.phone ? { telephone: contact.phone } : {}),
    ...(contact.address ? { address: contact.address } : {}),
    sameAs: contact.socials.map((x) => x.href),
  };

  return (
    <footer className="relative z-10 border-t border-line-soft">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />
      <div className="mx-auto max-w-[1400px] px-6 pb-10 pt-20 md:px-10 md:pt-28">
        {/* top row */}
        <div className="grid gap-14 md:grid-cols-12">
          <Reveal className="md:col-span-5">
            <Link href="/" aria-label={`${s.storeName} — home`} className="inline-flex min-w-0 max-w-full items-center gap-3 sm:gap-4">
              <Image
                src="/images/mkr-logo.jpg"
                alt={`${s.storeName} logo`}
                width={627}
                height={627}
                className="h-11 w-11 shrink-0 rounded-xl object-cover sm:h-14 sm:w-14"
              />
              <span className="font-rose min-w-0 flex-1 truncate text-xl leading-none text-foam sm:text-2xl">
                {s.storeName.toUpperCase()}—Casual Threads & Style
              </span>
            </Link>
            <p className="body-lead mt-6 max-w-sm">
              {s.siteTagline} A small, considered catalogue — designed for everyday
              life, delivered across Bangladesh.
            </p>

            {/* admin-managed contact methods (hidden when empty/disabled) */}
            {showContact ? (
              <div className="mt-8">
                <ContactMethodList contact={contact} />
                <div className="mt-6">
                  <SocialIconRow contact={contact} />
                </div>
              </div>
            ) : (
              <p className="mt-8 text-sm text-mist/60">Contact information will be available soon.</p>
            )}
          </Reveal>

          <Reveal delay={90} className="md:col-span-3">
            <p className="label label--bright mb-6">Shop</p>
            <ul className="space-y-3.5 text-sm">
              <li><Link className="link-line text-mist hover:text-foam" href="/shop">All Products</Link></li>
              <li><Link className="link-line text-mist hover:text-foam" href="/shop?view=new">New Arrivals</Link></li>
            </ul>
          </Reveal>

          <Reveal delay={160} className="md:col-span-2">
            <p className="label label--bright mb-6">Company</p>
            <ul className="space-y-3.5 text-sm">
              <li><Link className="link-line text-mist hover:text-foam" href="/about">About</Link></li>
              <li><Link className="link-line text-mist hover:text-foam" href="/contact">Contact</Link></li>
              <li><Link className="link-line text-mist hover:text-foam" href="/faq">FAQ</Link></li>
              <li><Link className="link-line text-mist hover:text-foam" href="/track">Track Order</Link></li>
            </ul>
          </Reveal>

          <Reveal delay={230} className="md:col-span-2">
            <p className="label label--bright mb-6">Payment</p>
            <ul className="flex flex-wrap gap-2.5">
              {[
                { n: "bKash", logo: "/images/payments/bkash.png" },
                { n: "Nagad", logo: "/images/payments/nagad.png" },
                { n: "Rocket", logo: "/images/payments/rocket.png" },
              ].map((p) => (
                <li key={p.n} className="flex items-center gap-2.5 rounded-lg border border-line-soft bg-white/[0.04] px-3 py-2">
                  <span className="grid h-6 w-11 place-items-center rounded-md bg-white px-1.5">
                    <Image src={p.logo} alt={p.n} width={32} height={14} className="h-3.5 w-auto object-contain" />
                  </span>
                  <span className="text-xs text-mist">{p.n}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-xs leading-relaxed text-mist/60">
              Delivery across Bangladesh — inside Chattogram ৳{s.deliveryFeeInside},
              outside Chattogram ৳{s.deliveryFeeOutside}. Pay the delivery charge in
              advance via bKash, Nagad or Rocket; products can be paid cash on delivery
              or fully in advance.
            </p>
          </Reveal>
        </div>

        <div className="hairline-full mt-16 md:mt-24" />

        {/* bottom row */}
        <div className="mt-8 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <p className="text-xs tracking-wide text-mist/60">
            © {new Date().getFullYear()} {s.storeName} · {locationLine}
          </p>
          <p className="label !text-mist/50">Less clutter. More space.</p>
          <Link
            href="/shop"
            className="group inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-soft hover:text-ice"
          >
            Explore Shop
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
      </div>
    </footer>
  );
}
