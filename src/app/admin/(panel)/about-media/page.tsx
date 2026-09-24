import { Badge, SectionHeading } from "@/components/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import { AboutSectionForm } from "@/components/admin/settings-forms";
import { deleteAboutSectionAction } from "@/app/actions/admin-settings";
import { listAboutSections } from "@/lib/data/media";

export const dynamic = "force-dynamic";

export default async function AdminAboutMediaPage() {
  const sections = await listAboutSections();

  return (
    <div className="space-y-6">
      <SectionHeading eyebrow="Content" title="About media & copy" description="Story sections with optional image/video stored in the uploads bucket (about/ prefix)." />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="glass h-max rounded-3xl p-6">
          <h2 className="mb-4 font-display text-lg text-[#f4faff]">Add a section</h2>
          <AboutSectionForm />
        </div>
        <div className="space-y-4">
          {sections.length === 0 ? (
            <p className="glass rounded-3xl p-6 text-sm text-[#a8c0d5]">No about sections yet.</p>
          ) : (
            sections.map((section) => (
              <article key={section.id} className="glass space-y-2 rounded-3xl p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-display text-base text-[#f4faff]">{section.heading}</p>
                    <p className="text-xs text-[#a8c0d5]">{section.section} · order {section.sortOrder}</p>
                  </div>
                  <Badge tone={section.isActive ? "success" : "warn"}>{section.isActive ? "active" : "hidden"}</Badge>
                </div>
                {section.body ? <p className="text-sm text-[#a8c0d5]">{section.body.slice(0, 200)}</p> : null}
                <form action={deleteAboutSectionAction}>
                  <input type="hidden" name="id" value={section.id} />
                  <SubmitButton pendingLabel="Deleting…" variant="danger" className="px-3 py-1.5 text-xs">Delete section</SubmitButton>
                </form>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
