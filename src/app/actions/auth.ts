"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { customers } from "@/db/schema";
import {
  createAuthToken,
  createCustomerSession,
  destroyCustomerSession,
  getCurrentCustomer,
  hashPassword,
  consumeAuthToken,
  verifyPassword,
} from "@/lib/auth/customer";
import { createServerAuthClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { mergeAnonymousCart } from "@/lib/data/commerce";
import { readCartToken } from "@/lib/auth/customer";
import { createNotification } from "@/lib/data/content";
import { emailConfigured, sendEmail, verificationEmail, passwordResetEmail } from "@/lib/email";
import { loginSchema, registerSchema, resetPasswordSchema, forgotPasswordSchema } from "@/lib/validation";
import type { ActionResult } from "@/types";

export type AuthActionState = ActionResult<{ verifyUrl?: string; resetUrl?: string }>;

async function completeSignIn(customerId: string) {
  const anonToken = await readCartToken();
  await mergeAnonymousCart(anonToken, customerId);
  const headerList = await headers();
  await createCustomerSession(customerId, headerList.get("user-agent"));
}

export async function registerAction(_prev: AuthActionState | undefined, formData: FormData): Promise<AuthActionState> {
  const parsed = registerSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Please review the form.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { fullName, email, password } = parsed.data;
  const phone = parsed.data.phone || null;

  const existing = await db.select({ id: customers.id }).from(customers).where(eq(customers.email, email)).limit(1);
  if (existing[0]) {
    return { ok: false, error: "An account with this email already exists. Try signing in." };
  }

  const supabase = await createServerAuthClient();
  const passwordHash = await hashPassword(password);
  const inserted = await db
    .insert(customers)
    .values({ email, passwordHash, fullName, phone, provider: "email" })
    .returning({ id: customers.id });
  const customerId = inserted[0].id;

  if (supabase) {
    const { data } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
    if (data.user) {
      await db
        .update(customers)
        .set({ authUserId: data.user.id, updatedAt: new Date() })
        .where(eq(customers.id, customerId));
    }
  }

  const verifyToken = await createAuthToken(customerId, "verify_email", 60 * 24);
  await createNotification({
    customerId,
    audience: "customer",
    kind: "info",
    title: "Welcome to MKR",
    body: "Your account is ready. Confirm your email to enable order receipts.",
    link: "/profile",
  });

  await completeSignIn(customerId);

  // Email the verification link. The raw token is NEVER returned in action
  // state or rendered on-screen (Phase 5/6). When no provider is configured
  // the user is told to use the resend action (which shows a safe message).
  if (emailConfigured()) {
    const siteUrl = env.siteUrl.replace(/\/$/, "");
    const sent = await sendEmail(verificationEmail(email, `${siteUrl}/verify-email?token=${verifyToken}`));
    if (!sent.sent) {
      console.error("[MKR auth] verification email failed:", sent.error);
    }
  }
  redirect("/verify-email?pending=1");
}

export async function loginAction(_prev: AuthActionState | undefined, formData: FormData): Promise<AuthActionState> {
  const next = (formData.get("next") as string | null) ?? "/profile";
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) {
    return { ok: false, error: "Enter your email and password.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const rows = await db.select().from(customers).where(eq(customers.email, parsed.data.email)).limit(1);
  const customer = rows[0];
  if (!customer || customer.status === "blocked") {
    return { ok: false, error: "Invalid email or password." };
  }
  const valid = await verifyPassword(parsed.data.password, customer.passwordHash);
  if (!valid) return { ok: false, error: "Invalid email or password." };

  await completeSignIn(customer.id);
  redirect(next.startsWith("/") ? next : "/profile");
}

export async function logoutAction(): Promise<void> {
  await destroyCustomerSession();
  redirect("/");
}

export async function forgotPasswordAction(
  _prev: AuthActionState | undefined,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { ok: false, error: "Enter a valid email address." };

  const rows = await db.select().from(customers).where(eq(customers.email, parsed.data.email)).limit(1);
  const supabase = await createServerAuthClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? "";

  if (supabase) {
    await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${siteUrl}/reset-password`,
    });
    return { ok: true, message: "If that email exists, a reset link is on its way." };
  }

  if (!rows[0]) {
    // Do not reveal whether the account exists.
    return { ok: true, message: "If that email exists, a reset link is on its way." };
  }

  const token = await createAuthToken(rows[0].id, "reset_password", 30);

  // Email the reset link. Never render it in the UI or return it in state.
  if (emailConfigured()) {
    const sent = await sendEmail(passwordResetEmail(parsed.data.email, `${siteUrl.replace(/\/$/, "")}/reset-password?token=${token}`));
    if (!sent.sent) {
      console.error("[MKR auth] reset email failed:", sent.error);
    }
    return { ok: true, message: "If that email exists, a reset link is on its way." };
  }

  return {
    ok: true,
    message:
      "Outbound email is not configured on this server, so the reset link could not be sent. Contact support to reset your password.",
  };
}

export async function resetPasswordAction(
  _prev: AuthActionState | undefined,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = resetPasswordSchema.safeParse({ token: formData.get("token"), password: formData.get("password") });
  if (!parsed.success) {
    return { ok: false, error: "Please check the reset link and password.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const customerId = await consumeAuthToken(parsed.data.token, "reset_password");
  if (!customerId) return { ok: false, error: "This reset link is invalid or has expired." };

  const passwordHash = await hashPassword(parsed.data.password);
  await db.update(customers).set({ passwordHash, updatedAt: new Date() }).where(eq(customers.id, customerId));
  await createNotification({
    customerId,
    audience: "customer",
    kind: "info",
    title: "Password updated",
    body: "Your MKR password was changed successfully.",
    link: "/profile/settings",
  });
  redirect("/login?reset=1");
}

export async function verifyEmailAction(token: string): Promise<ActionResult> {
  const customerId = await consumeAuthToken(token, "verify_email");
  if (!customerId) return { ok: false, error: "This verification link is invalid or has already been used." };
  await db
    .update(customers)
    .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
    .where(eq(customers.id, customerId));
  return { ok: true, message: "Your email is verified." };
}

export async function resendVerificationAction(): Promise<AuthActionState> {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, error: "Sign in first." };

  if (!emailConfigured()) {
    return {
      ok: false,
      error: "Outbound email is not configured on this server. Please contact support to verify your address.",
    };
  }

  const token = await createAuthToken(customer.id, "verify_email", 60 * 24);
  const sent = await sendEmail(
    verificationEmail(customer.email, `${env.siteUrl.replace(/\/$/, "")}/verify-email?token=${token}`),
  );
  if (!sent.sent) {
    console.error("[MKR auth] verification resend failed:", sent.error);
    return { ok: false, error: "The verification email could not be sent right now. Please try again later." };
  }
  return { ok: true, message: `A verification link was sent to ${customer.email}.` };
}
