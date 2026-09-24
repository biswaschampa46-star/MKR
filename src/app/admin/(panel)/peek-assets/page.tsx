import { SectionHeading } from "@/components/ui";
import { MobileHeroImageForm, PeekAssetsForm } from "@/components/admin/settings-forms";
import { getMobileHeroImage, getPeekAssetSettings } from "@/lib/data/content";

export const dynamic = "force-dynamic";

export default async function AdminPeekAssetsPage() {
  const value = await getPeekAssetSettings();
  const mobileHero = await getMobileHeroImage();

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Content"
        title="Floating product peek"
        description="Images for the homepage brand-statement animation. Uploads go to Supabase Storage (uploads bucket, peek/ prefix) — transparent cutouts look best."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-6">
          <PeekAssetsForm value={value} />
          <MobileHeroImageForm value={mobileHero} />
        </div>
        <aside className="glass h-max space-y-4 rounded-3xl p-6 text-sm text-[#a8c0d5]">
          <h2 className="font-display text-base text-[#f4faff]">How it appears</h2>
          <p>
            The three images float in one after another as visitors scroll to “The MKR standard”:
            lead jeans first, then the light jeans, then the shirt. On desktop/tablet mirrored
            stacks peek from BOTH edges simultaneously.
          </p>
          <p>
            <strong className="text-[#f4faff]">Mobile:</strong> phones never render the floating
            stack — they show the single Mobile Hero Image below instead (with a premium cinematic
            entrance). If no mobile image is set, phones show a clean static hero.
          </p>
          <p>
            Best results: square-ish transparent PNG or WebP, 800×1200 or larger, garment only —
            no baked-in background or shadow (the site adds its own depth).
          </p>
        </aside>
      </div>
    </div>
  );
}
