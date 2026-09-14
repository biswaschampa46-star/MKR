import type { Metadata } from "next";
import { Clock, Headset } from "lucide-react";
import Reveal from "@/components/Reveal";
import ContactForm from "@/components/ContactForm";
import { ContactMethodList, SocialIconRow } from "@/components/ContactInfo";
import { getContactDetails, hasAnyContact } from "@/lib/contact";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const c = await getContactDetails();
  return {
    title: "Contact",
    description: c.description || `Get in touch with ${c.storeName} — questions about orders, products or payments.`,
  };
}

export default async function ContactPage() {
  /* Complete enabled contact info, managed from Admin → Contact Details. */
  const contact = await getContactDetails();
  const showContact = hasAnyContact(contact);

  return (
    <div className="mx-auto max-w-[1400px] px-6 pb-28 pt-36 md:px-10 md:pt-44">
      <div className="grid gap-16 md:grid-cols-12">
        <Reveal className="md:col-span-6">
          <p className="label">Contact</p>
          <h1 className="display-2 mt-6 text-foam">
            Say hello.
          </h1>
          <p className="body-lead mt-7 max-w-md">
            {contact.description ||
              "Questions about an order, a product, or a payment — write to us and a real person will reply."}
          </p>

          {/* admin-managed contact channels */}
          {showContact ? (
            <div className="mt-10">
              <ContactMethodList contact={contact} />
              {(contact.supportHours || contact.socials.length > 0) && (
                <div className="mt-8 space-y-4">
                  {contact.supportHours && (
                    <p className="flex items-center gap-3 text-sm text-mist">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line-soft bg-white/[0.04] text-soft">
                        <Headset className="h-4 w-4" strokeWidth={1.8} />
                      </span>
                      Support: {contact.supportHours}
                    </p>
                  )}
                  {contact.openingHours && contact.address == null && (
                    <p className="flex items-center gap-3 text-sm text-mist">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line-soft bg-white/[0.04] text-soft">
                        <Clock className="h-4 w-4" strokeWidth={1.8} />
                      </span>
                      {contact.openingHours}
                    </p>
                  )}
                  <SocialIconRow contact={contact} />
                </div>
              )}
            </div>
          ) : (
            <p className="mt-10 text-sm text-mist/70">Contact information will be available soon.</p>
          )}

          <p className="mt-8 text-sm text-mist/70">
            Include your order number for anything order-related — it helps us
            help you faster.
          </p>
        </Reveal>

        <Reveal delay={130} className="md:col-span-5 md:col-start-8">
          <ContactForm />
        </Reveal>
      </div>
    </div>
  );
}
