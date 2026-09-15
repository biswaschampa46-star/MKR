import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCampaignById } from "@/lib/promotions";
import AdminShell from "@/components/admin/AdminShell";
import BannerForm from "@/components/admin/BannerForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin — Edit Campaign", robots: { index: false } };

export default async function EditPromotionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const campaign = await getCampaignById(id);
  if (!campaign) notFound();

  return (
    <AdminShell>
      <h1 className="font-display mb-8 text-2xl font-bold text-foam">
        Edit — {campaign.campaignName}
      </h1>
      <BannerForm
        initial={{
          id: campaign.id,
          campaignName: campaign.campaignName,
          label: campaign.label,
          heading: campaign.heading,
          description: campaign.description,
          campaignType: campaign.campaignType,
          discountKind: campaign.discountKind,
          discountValue: campaign.discountValue,
          couponCode: campaign.couponCode,
          ctaText: campaign.ctaText,
          ctaUrl: campaign.ctaUrl,
          bgMode: campaign.bgMode,
          bgColor: campaign.bgColor,
          bgColor2: campaign.bgColor2,
          textColor: campaign.textColor,
          accentColor: campaign.accentColor,
          buttonColor: campaign.buttonColor,
          buttonTextColor: campaign.buttonTextColor,
          radius: campaign.radius,
          height: campaign.height,
          layout: campaign.layout,
          align: campaign.align,
          gradientEnabled: campaign.gradientEnabled,
          animationEnabled: campaign.animationEnabled,
          imageUrl: campaign.imageUrl,
          mobileImageUrl: campaign.mobileImageUrl,
          placement: campaign.placement,
          targetType: campaign.targetType,
          targetId: campaign.targetId,
          startAt: campaign.startAt ? campaign.startAt.toISOString() : null,
          endAt: campaign.endAt ? campaign.endAt.toISOString() : null,
          priority: campaign.priority,
          isEnabled: campaign.isEnabled,
        }}
      />
    </AdminShell>
  );
}
