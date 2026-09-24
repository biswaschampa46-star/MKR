import { SectionHeading } from "@/components/ui";
import { ContactSettingsForm } from "@/components/admin/settings-forms";
import { getContactSettings } from "@/lib/data/content";

export const dynamic = "force-dynamic";

export default async function AdminContactDetailsPage() {
  const contact = await getContactSettings();
  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Brand"
        title="Contact details"
        description="Used on the contact page, footer and Organization structured data. The Contact / Social Links URLs feed the floating contact menu on the storefront."
      />
      <ContactSettingsForm value={contact as unknown as Record<string, string | null>} />
    </div>
  );
}
