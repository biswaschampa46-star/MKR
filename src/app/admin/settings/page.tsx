import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";
import SettingsForm from "@/components/admin/SettingsForm";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin — Settings", robots: { index: false } };

export default async function AdminSettingsPage() {
  const settings = await getSettings();
  return (
    <AdminShell active="Settings">
      <h1 className="font-display mb-8 text-2xl font-bold text-foam">Settings</h1>
      <SettingsForm initial={settings} />
    </AdminShell>
  );
}
