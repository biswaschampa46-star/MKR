import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";
import ContactDetailsForm from "@/components/admin/ContactDetailsForm";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin — Contact Details", robots: { index: false } };

export default async function AdminContactDetailsPage() {
  const settings = await getSettings();
  return (
    <AdminShell active="Contact Details">
      <div className="mb-8 max-w-3xl">
        <h1 className="font-display text-2xl font-bold text-foam">Contact Details</h1>
        <p className="mt-2 text-sm leading-relaxed text-mist">
          Manage the store&apos;s public contact information in one place. Changes take effect
          on the website immediately — no code changes needed.
        </p>
      </div>
      <div className="max-w-3xl">
        <ContactDetailsForm initial={settings} />
      </div>
    </AdminShell>
  );
}
