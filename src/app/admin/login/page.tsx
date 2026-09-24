import { redirect } from "next/navigation";
import { GlassCard, Logo } from "@/components/ui";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { adminCredentialState, getAdminSession } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const session = await getAdminSession();
  if (session) redirect("/admin/dashboard");
  const state = await adminCredentialState();

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div className="text-center">
        <Logo showTagline className="items-center" />
        <h1 className="mt-6 font-display text-2xl text-[#f4faff]">Admin access</h1>
        <p className="mt-1 text-sm text-[#a8c0d5]">
          Credentials are verified server-side; the session cookie is httpOnly, signed and re-verified on every request.
        </p>
      </div>
      <GlassCard className="p-6">
        <AdminLoginForm configured={state.configured} />
      </GlassCard>
      <p className="text-center text-[11px] uppercase tracking-[0.2em] text-[#a8c0d5]/70">
        Source:{" "}
        {state.source === "environment"
          ? "ADMIN_EMAIL / ADMIN_PASSWORD environment"
          : state.source === "database"
            ? "settings credential (bcrypt hash)"
            : "not configured"}
      </p>
    </div>
  );
}
