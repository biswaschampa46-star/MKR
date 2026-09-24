"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  adminCredentialState,
  bootstrapAdminCredential,
  createAdminSession,
  destroyAdminSession,
  verifyAdminCredentials,
} from "@/lib/auth/admin";
import { adminLoginSchema, bootstrapAdminSchema } from "@/lib/validation";
import type { ActionResult } from "@/types";

type FormState = ActionResult | undefined;

export async function adminLoginAction(_prev: FormState, formData: FormData): Promise<ActionResult> {
  const parsed = adminLoginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { ok: false, error: "Enter the admin email and password." };

  const state = await adminCredentialState();
  if (!state.configured) {
    return {
      ok: false,
      error:
        "No admin credential is configured. Set ADMIN_EMAIL and ADMIN_PASSWORD (recommended) or complete one-time setup below.",
    };
  }

  const valid = await verifyAdminCredentials(parsed.data.email, parsed.data.password);
  if (!valid) return { ok: false, error: "Invalid admin credentials." };

  await createAdminSession(parsed.data.email);
  redirect("/admin/dashboard");
}

export async function adminBootstrapAction(_prev: FormState, formData: FormData): Promise<ActionResult> {
  const parsed = bootstrapAdminSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { ok: false, error: "Use a valid email and a password of 8+ characters." };

  try {
    await bootstrapAdminCredential(parsed.data.email, parsed.data.password);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Setup failed." };
  }
  await createAdminSession(parsed.data.email);
  revalidatePath("/admin");
  redirect("/admin/dashboard");
}

export async function adminLogoutAction(): Promise<void> {
  await destroyAdminSession();
  redirect("/admin/login");
}
