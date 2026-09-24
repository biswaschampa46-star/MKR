import { SectionHeading } from "@/components/ui";
import { MarketingSettingsForm } from "@/components/admin/settings-forms";
import { getMarketingSettings } from "@/lib/data/content";

export const dynamic = "force-dynamic";

export default async function AdminMarketingPage() {
  const marketing = await getMarketingSettings();
  return (
    <div className="space-y-6">
      <SectionHeading eyebrow="Growth" title="Marketing" description="Announcement bar, hero timing and metadata suffix used across the storefront." />
      <MarketingSettingsForm value={marketing} />
    </div>
  );
}
