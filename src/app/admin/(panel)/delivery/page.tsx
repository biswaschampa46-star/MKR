import { SectionHeading } from "@/components/ui";
import { DeliverySettingsForm } from "@/components/admin/settings-forms";
import { getDeliverySettings } from "@/lib/data/content";

export const dynamic = "force-dynamic";

export default async function AdminDeliveryPage() {
  const delivery = await getDeliverySettings();
  return (
    <div className="space-y-6">
      <SectionHeading eyebrow="Logistics" title="Delivery" description="Bangladesh-only delivery. Fees are never hardcoded in the frontend — checkout asks the database." />
      <DeliverySettingsForm
        zones={delivery.zones}
        freeDeliveryThreshold={delivery.freeDeliveryThreshold}
        codEnabled={delivery.codEnabled}
        prepaidDeliveryEnabled={delivery.prepaidDeliveryEnabled}
      />
    </div>
  );
}
