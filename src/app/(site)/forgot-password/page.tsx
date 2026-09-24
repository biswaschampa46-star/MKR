import type { Metadata } from "next";
import { GlassCard, Logo } from "@/components/ui";
import { ForgotPasswordForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Reset password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 py-10">
      <div className="text-center">
        <Logo showTagline className="items-center" />
        <p className="meta-label mt-6">Account recovery</p>
        <h1 className="display-1 mt-3 text-[#f4faff]">Reset your password</h1>
        <p className="mt-3 text-sm text-[#a8c0d5]">We will send a one-time link to your email address.</p>
      </div>
      <GlassCard className="p-6">
        <ForgotPasswordForm />
      </GlassCard>
    </div>
  );
}
