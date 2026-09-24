import { Badge, SectionHeading } from "@/components/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import { HeroSlideForm } from "@/components/admin/settings-forms";
import { deleteHeroSlideAction } from "@/app/actions/admin-settings";
import { heroMediaKind, listHeroSlides } from "@/lib/data/media";

export const dynamic = "force-dynamic";

export default async function AdminHeroVideosPage() {
  const slides = await listHeroSlides();
  // Seed the form's mobile controls with the live slide's settings so the
  // ratio/enable state reflects what the storefront actually uses.
  const active = slides[0];

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Content"
        title="Hero videos & images"
        description="Uploads go to Supabase Storage (uploads bucket, hero/ prefix). The homepage plays the first active slide."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="glass h-max rounded-3xl p-6">
          <h2 className="mb-4 font-display text-lg text-[#f4faff]">Add a slide</h2>
          <HeroSlideForm
            slide={active ? { id: active.id, eyebrow: active.eyebrow, heading: active.heading, subheading: active.subheading, ctaLabel: active.ctaLabel, ctaHref: active.ctaHref, sortOrder: active.sortOrder, isActive: active.isActive } : undefined}
            desktopMediaId={active?.mediaId ?? null}
            desktopMediaKind={heroMediaKind(active?.mediaKind, active?.mediaType)}
            mobileMediaId={active?.mobileMediaId ?? null}
            mobileMediaUrl={active?.mobileMediaUrl ?? null}
            mobileMediaKind={heroMediaKind(active?.mobileMediaKind, active?.mobileMediaType)}
            mobileAspectRatio={active?.mobileAspectRatio ?? "9:16"}
            mobileIsActive={active?.mobileIsActive ?? true}
          />
        </div>
        <div className="space-y-4">
          {slides.length === 0 ? (
            <p className="glass rounded-3xl p-6 text-sm text-[#a8c0d5]">No hero slides yet — the homepage shows a branded gradient hero until one is added.</p>
          ) : (
            slides.map((slide) => (
              <article key={slide.id} className="glass space-y-3 rounded-3xl p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-display text-base text-[#f4faff]">{slide.heading}</p>
                    <p className="text-xs text-[#a8c0d5]">{slide.eyebrow ?? "—"} · order {slide.sortOrder}</p>
                  </div>
                  <Badge tone={slide.isActive ? "success" : "warn"}>{slide.isActive ? "active" : "hidden"}</Badge>
                </div>
                {slide.mediaUrl ? (
                  heroMediaKind(slide.mediaKind, slide.mediaType) === "video" ? (
                    <video src={slide.mediaUrl} className="aspect-video w-full rounded-2xl object-cover" muted controls playsInline />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={slide.mediaUrl} alt={slide.heading} className="aspect-video w-full rounded-2xl object-cover" />
                  )
                ) : null}
                <form action={deleteHeroSlideAction}>
                  <input type="hidden" name="id" value={slide.id} />
                  <SubmitButton pendingLabel="Deleting…" variant="danger" className="px-3 py-1.5 text-xs">Delete slide</SubmitButton>
                </form>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
