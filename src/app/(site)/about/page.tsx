import type { Metadata } from "next";
import { Alert, EmptyState, LinkButton, SectionHeading } from "@/components/ui";
import { MediaImage } from "@/components/media-image";
import { listAboutSections } from "@/lib/data/media";
import { getContactSettings } from "@/lib/data/content";

export const metadata: Metadata = {
  title: "About MKR",
  description: "MKR — Casual Threads & Style. Premium minimal clothing designed in Bangladesh.",
  alternates: { canonical: "/about" },
};

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  let sections;
  try {
    sections = await listAboutSections(true);
  } catch (error) {
    return (
      <Alert tone="error">
        About content could not be loaded — please retry later.
      </Alert>
    );
  }
  const contact = await getContactSettings();

  return (
    <div className="mx-auto w-full max-w-[88rem] space-y-14">
      <SectionHeading
        eyebrow="Our story"
        title="MKR — Casual Threads & Style"
        description="Clothing built for everyday presence: considered fabric, honest construction, restrained detailing."
      />

      {sections.length === 0 ? (
        <EmptyState
          title="About content is being written"
          description="Our story is being crafted. In the meantime, explore the collection — every MKR piece is cut for everyday presence."
          action={<LinkButton href="/shop" variant="outline" size="sm">Shop the collection</LinkButton>}
        />
      ) : (
        <div className="space-y-16">
          {sections.map((section, index) => (
            <section key={section.id} className="grid gap-8 lg:grid-cols-2 lg:items-center" data-reveal="scale" suppressHydrationWarning>
              <div className={index % 2 === 1 ? "lg:order-2" : ""}>
                <MediaImage
                  src={section.mediaUrl}
                  alt={section.heading}
                  className="aspect-[4/3] w-full rounded-3xl border border-[#a8c0d5]/12"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
              <div className="space-y-4">
                <p className="text-[11px] uppercase tracking-[0.3em] text-[#8ccbff]">{section.section}</p>
                <h2 className="font-display text-3xl text-[#f4faff]">{section.heading}</h2>
                {section.body ? <p className="whitespace-pre-line text-sm text-[#a8c0d5]">{section.body}</p> : null}
              </div>
            </section>
          ))}
        </div>
      )}

      <section className="glass rounded-[2rem] p-6 text-center sm:p-10" data-reveal suppressHydrationWarning>
        <h2 className="font-display text-2xl text-[#f4faff]">Visit or talk to us</h2>
        {contact.address ? <p className="mx-auto mt-2 max-w-xl whitespace-pre-line text-sm text-[#a8c0d5]">{contact.address}</p> : null}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <LinkButton href="/shop" size="lg">Shop now</LinkButton>
          <LinkButton href="/contact" variant="outline" size="lg">Contact</LinkButton>
        </div>
      </section>
    </div>
  );
}
