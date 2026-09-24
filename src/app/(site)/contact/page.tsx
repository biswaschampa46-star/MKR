import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui";
import { ContactForm } from "@/components/contact-form";
import { getContactSettings } from "@/lib/data/content";
import { getCurrentCustomer } from "@/lib/auth/customer";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: "Contact MKR",
  description: "Reach the MKR studio for order support, sizing help and wholesale enquiries.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const [contact, customer] = await Promise.all([getContactSettings(), getCurrentCustomer()]);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "MKR — Casual Threads & Style",
    url: env.siteUrl,
    ...(contact.email ? { email: contact.email } : {}),
    ...(contact.phone ? { telephone: contact.phone } : {}),
    ...(contact.address ? { address: { "@type": "PostalAddress", streetAddress: contact.address, addressCountry: "BD" } } : {}),
  };

  return (
    <div className="mx-auto w-full max-w-[88rem] space-y-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <SectionHeading
        eyebrow="Say hello"
        title="Contact the studio"
        description="Order support, sizing questions or collaboration ideas — we read everything."
      />

      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <div className="glass rounded-3xl p-6">
          <ContactForm defaultEmail={customer?.email ?? ""} />
        </div>

        <aside className="space-y-4">
          <div className="glass space-y-2 rounded-3xl p-6 text-sm">
            <h2 className="font-display text-lg text-[#f4faff]">Direct lines</h2>
            {contact.phone ? <p className="text-[#a8c0d5]">Phone: <span className="text-[#f4faff]">{contact.phone}</span></p> : null}
            {contact.whatsapp ? <p className="text-[#a8c0d5]">WhatsApp: <span className="text-[#f4faff]">{contact.whatsapp}</span></p> : null}
            {contact.email ? <p className="text-[#a8c0d5]">Email: <span className="text-[#f4faff]">{contact.email}</span></p> : null}
            {contact.address ? <p className="whitespace-pre-line text-[#a8c0d5]">{contact.address}</p> : null}
            {contact.hours ? <p className="text-[#a8c0d5]">{contact.hours}</p> : null}
            {!contact.email && !contact.phone ? (
              <p className="text-[#a8c0d5]">
                Our team is finalising the best way to reach us. In the meantime, orders and delivery updates are handled
                through order tracking and your account.
              </p>
            ) : null}
          </div>
          {contact.facebook || contact.instagram ? (
            <div className="glass flex flex-wrap gap-3 rounded-3xl p-6 text-sm">
              {contact.facebook ? (
                <a href={contact.facebook} className="text-[#8ccbff] hover:underline" rel="noreferrer" target="_blank">Facebook</a>
              ) : null}
              {contact.instagram ? (
                <a href={contact.instagram} className="text-[#8ccbff] hover:underline" rel="noreferrer" target="_blank">Instagram</a>
              ) : null}
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
