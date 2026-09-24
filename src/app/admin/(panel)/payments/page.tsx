import { Alert, SectionHeading } from "@/components/ui";
import { PaymentSettingsForm } from "@/components/admin/settings-forms";
import { getPaymentSettings } from "@/lib/data/content";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  const payments = await getPaymentSettings();
  return (
    <div className="space-y-6">
      <SectionHeading eyebrow="Finance" title="Payments" description="Manual mobile send-money (bKash / Nagad / Rocket) plus cash on delivery, with manual transaction verification." />
      <Alert tone="info">
        Environment variables PAYMENT_BKASH_NUMBER / PAYMENT_NAGAD_NUMBER / PAYMENT_ROCKET_NUMBER are used as fallbacks.
        Values saved here are stored in the settings table and take precedence. Secrets are never logged.
      </Alert>
      <PaymentSettingsForm
        bkash={payments.bkash}
        nagad={payments.nagad}
        rocket={payments.rocket}
        instructions={payments.instructions}
        source={payments.configuredSource}
      />
    </div>
  );
}
