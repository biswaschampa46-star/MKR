import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { adminCredentialState, requireAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export default async function AdminPanelLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  const state = await adminCredentialState();
  return <AdminShell email={state.email}>{children}</AdminShell>;
}
