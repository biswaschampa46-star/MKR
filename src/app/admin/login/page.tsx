import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import LoginForm from "@/components/admin/LoginForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin Login", robots: { index: false } };

export default async function AdminLoginPage() {
  if (await isAdmin()) redirect("/admin/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#04101c] px-6">
      <LoginForm />
    </div>
  );
}
