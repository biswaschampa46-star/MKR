import type { Metadata } from "next";
import Image from "next/image";
import { Alert, Badge, SectionHeading } from "@/components/ui";
import { AvatarUploadForm, PasswordForm, ProfileSettingsForm } from "@/components/profile/profile-forms";
import { changeEmailFormAction } from "@/app/actions/profile";
import { requireCustomer } from "@/lib/auth/customer";
import { supabasePublicConfigured } from "@/lib/env";
import { storageMode } from "@/lib/storage";

export const metadata: Metadata = { title: "Account settings", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const customer = await requireCustomer("/profile/settings");

  return (
    <div className="space-y-8">
      <SectionHeading eyebrow="Settings" title="Account settings" description="Profile data and media live in Supabase; sessions stay in httpOnly cookies." />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="glass space-y-4 rounded-3xl p-6">
          <h2 className="font-display text-lg text-[#f4faff]">Profile</h2>
          <div className="flex items-center gap-4">
            {customer.avatarUrl ? (
              <Image src={customer.avatarUrl} alt={customer.fullName ?? "Profile"} width={64} height={64} className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#a8c0d5]/25 text-xs uppercase tracking-[0.2em] text-[#8ccbff]">
                MKR
              </div>
            )}
            <div className="text-xs text-[#a8c0d5]">
              <p>{customer.email}</p>
              <p className="mt-1">
                <Badge tone={customer.emailVerified ? "success" : "warn"}>
                  {customer.emailVerified ? "Email verified" : "Verification pending"}
                </Badge>
              </p>
            </div>
          </div>
          <ProfileSettingsForm
            fullName={customer.fullName ?? ""}
            phone={customer.phone ?? ""}
            marketingOptIn={customer.marketingOptIn}
          />
        </section>

        <section className="glass space-y-6 rounded-3xl p-6">
          <div className="space-y-3">
            <h2 className="font-display text-lg text-[#f4faff]">Profile photo</h2>
            <AvatarUploadForm />
          </div>
          <div className="space-y-3 border-t border-[#a8c0d5]/15 pt-6">
            <h2 className="font-display text-lg text-[#f4faff]">Password</h2>
            <PasswordForm />
          </div>
        </section>

        <section className="glass space-y-4 rounded-3xl p-6">
          <h2 className="font-display text-lg text-[#f4faff]">Change email</h2>
          <form action={changeEmailFormAction} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a8c0d5]" htmlFor="email">
                New email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                defaultValue={customer.email}
                className="w-full rounded-2xl border border-[#a8c0d5]/25 bg-[#071a2b]/70 px-4 py-3 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a8c0d5]" htmlFor="password">
                Confirm with password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full rounded-2xl border border-[#a8c0d5]/25 bg-[#071a2b]/70 px-4 py-3 text-sm"
              />
            </div>
            <button type="submit" className="rounded-full border border-[#a8c0d5]/25 px-5 py-2.5 text-sm text-[#f4faff] transition hover:border-[#8ccbff]">
              Update email
            </button>
          </form>
        </section>

        <section className="glass space-y-3 rounded-3xl p-6">
          <h2 className="font-display text-lg text-[#f4faff]">Platform status</h2>
          <Alert tone={supabasePublicConfigured() ? "success" : "warn"}>
            Supabase Auth: {supabasePublicConfigured() ? "configured — Google OAuth and email verification available" : "not configured — internal httpOnly cookie sessions in use"}
          </Alert>
          <Alert tone={storageMode() === "supabase" ? "success" : "warn"}>
            Media storage driver: {storageMode() === "supabase" ? "Supabase Storage (uploads bucket)" : "PostgreSQL media_assets + /api/media (no local uploads)"}
          </Alert>
        </section>
      </div>
    </div>
  );
}
