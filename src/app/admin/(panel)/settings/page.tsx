import { Alert, Badge, SectionHeading } from "@/components/ui";
import { FaqSettingsForm } from "@/components/admin/settings-forms";
import { getFaqSettings } from "@/lib/data/content";
import { environmentReport, supabasePublicConfigured } from "@/lib/env";
import { storageMode } from "@/lib/storage";
import { dashboardDiagnostics } from "@/lib/data/diagnostics";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const [faq, diagnostics] = await Promise.all([getFaqSettings(), dashboardDiagnostics()]);
  const env = environmentReport();

  return (
    <div className="space-y-6">
      <SectionHeading eyebrow="Platform" title="Settings & diagnostics" description="Environment variable names only — never values. Missing variables are shown with their purpose." />

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Database", value: diagnostics.database, tone: diagnostics.database === "connected" ? "success" : "danger" },
          { label: "Supabase Auth", value: supabasePublicConfigured() ? "configured" : "not configured", tone: supabasePublicConfigured() ? "success" : "warn" },
          { label: "Media driver", value: storageMode(), tone: storageMode() === "supabase" ? "success" : "warn" },
        ].map((card) => (
          <div key={card.label} className="glass space-y-2 rounded-3xl p-5">
            <p className="text-[11px] uppercase tracking-[0.24em] text-[#8ccbff]">{card.label}</p>
            <Badge tone={card.tone as "success" | "warn" | "danger"}>{card.value}</Badge>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {diagnostics.counts.map((count) => (
          <div key={count.label} className="glass flex items-center justify-between rounded-3xl p-5 text-sm">
            <span className="text-[#a8c0d5]">{count.label}</span>
            <span className="font-display text-lg text-[#f4faff]">{count.value}</span>
          </div>
        ))}
      </div>

      <section className="glass space-y-3 rounded-3xl p-6">
        <h2 className="font-display text-lg text-[#f4faff]">Environment report</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {env.map((item) => (
            <div key={item.name} className="flex items-center justify-between gap-3 rounded-2xl border border-[#a8c0d5]/12 px-3 py-2 text-xs">
              <span className="break-all text-[#ddf3ff]">{item.name}</span>
              <Badge tone={item.configured ? "success" : item.required ? "danger" : "warn"}>
                {item.configured ? "set" : "missing"}
              </Badge>
            </div>
          ))}
        </div>
        <Alert tone="info">{diagnostics.notes.join(" ")}</Alert>
      </section>

      <FaqSettingsForm items={faq.items} />
    </div>
  );
}
