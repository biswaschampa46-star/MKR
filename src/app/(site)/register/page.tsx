import type { Metadata } from "next";
import { GlassCard, Logo } from "@/components/ui";
import { GoogleButton, RegisterForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Create account", robots: { index: false } };

export default function RegisterPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 py-10">
      <div className="text-center">
        <Logo showTagline className="items-center" />
        <p className="meta-label mt-6">Join MKR</p>
        <h1 className="display-1 mt-3 text-[#f4faff]">Create your account</h1>
        <p className="mt-3 text-sm text-[#a8c0d5]">Faster checkout, saved addresses and order tracking.</p>
      </div>
      <GlassCard className="space-y-5 p-6">
        <RegisterForm />
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.3em] text-[#a8c0d5]/70">
          <span className="h-px flex-1 bg-[#a8c0d5]/20" /> or <span className="h-px flex-1 bg-[#a8c0d5]/20" />
        </div>
        <GoogleButton />
      </GlassCard>
    </div>
  );
}
