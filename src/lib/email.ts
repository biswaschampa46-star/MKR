/**
 * Email transport abstraction (Phase 5).
 *
 * Providers, in priority order:
 *   1. RESEND_API_KEY  — Resend HTTP API (serverless-friendly, no SMTP port)
 *   2. SMTP_URL        — documented hook for a future SMTP provider (not faked)
 *
 * If NO provider is configured, `sendEmail` returns `{ sent: false, reason }`
 * and every caller surfaces a safe configuration message instead of faking
 * "email sent" or rendering secret tokens on-screen.
 *
 * Security rules enforced here:
 *   - tokens/links are NEVER logged
 *   - failures return structured results, not thrown raw provider errors
 *   - the API key never leaves this module
 */
import { env } from "@/lib/env";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export type EmailResult = { sent: boolean; error?: string };

export const emailConfigured = (): boolean =>
  Boolean(read("RESEND_API_KEY") && read("EMAIL_FROM"));

const read = (key: string): string | undefined => {
  const raw = process.env[key];
  return raw && raw.trim().length > 0 ? raw.trim() : undefined;
};

async function sendViaResend(message: EmailMessage): Promise<EmailResult> {
  const key = read("RESEND_API_KEY")!;
  const from = read("EMAIL_FROM")!;
  const replyTo = read("EMAIL_REPLY_TO");

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      // Structured, secret-free error. Never include the API key or body tokens.
      return { sent: false, error: `Email provider rejected the message (HTTP ${response.status}).` };
    }
    return { sent: true };
  } catch (error) {
    return {
      sent: false,
      error: error instanceof Error ? `Email transport failed: ${error.message.slice(0, 120)}` : "Email transport failed.",
    };
  }
}

/**
 * Sends an email through the first configured provider.
 * Returns { sent: false } with a safe reason when nothing is configured —
 * callers MUST surface a configuration message, never fake success.
 */
export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  if (read("RESEND_API_KEY")) {
    if (!read("EMAIL_FROM")) {
      return { sent: false, error: "EMAIL_FROM is not configured." };
    }
    return sendViaResend(message);
  }
  return {
    sent: false,
    error:
      "No email provider is configured on this server. Add RESEND_API_KEY and EMAIL_FROM to send verification and password-reset emails.",
  };
}

/* ------------------------------- templates -------------------------------- */

const shell = (heading: string, body: string, ctaLabel: string, ctaUrl: string) => `
<!doctype html><html><body style="margin:0;padding:0;background:#050b14;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 24px;color:#ddf3ff;">
    <p style="letter-spacing:0.34em;font-size:20px;color:#f4faff;margin:0 0 28px;font-family:Arial,Helvetica,sans-serif;font-weight:700;">MKR</p>
    <h1 style="font-size:22px;color:#f4faff;margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;">${heading}</h1>
    <p style="font-size:14px;line-height:1.7;color:#a8c0d5;margin:0 0 28px;">${body}</p>
    <a href="${ctaUrl}" style="display:inline-block;background:linear-gradient(90deg,#4da8ff,#8ccbff);color:#071a2b;text-decoration:none;padding:12px 28px;border-radius:999px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;">${ctaLabel}</a>
    <p style="font-size:11px;color:#6b8299;margin-top:32px;line-height:1.6;">If the button does not work, copy this link into your browser:<br>${ctaUrl}</p>
    <p style="font-size:11px;color:#6b8299;margin-top:8px;">If you did not request this email, you can safely ignore it.</p>
  </div>
</body></html>`;

export function verificationEmail(to: string, verifyUrl: string): EmailMessage {
  return {
    to,
    subject: "Verify your MKR email",
    html: shell(
      "Confirm your address",
      "Welcome to MKR. Confirm your email address to enable order receipts and account recovery. This link expires in 24 hours and can be used once.",
      "Verify my email",
      verifyUrl,
    ),
    text: `Welcome to MKR. Verify your email: ${verifyUrl} (expires in 24 hours, one-time use). If you did not create an account, ignore this email.`,
  };
}

export function passwordResetEmail(to: string, resetUrl: string): EmailMessage {
  return {
    to,
    subject: "Reset your MKR password",
    html: shell(
      "Password reset",
      "We received a request to reset your MKR password. This link expires in 30 minutes and can be used once. If you did not request it, your account is still safe — ignore this email.",
      "Choose a new password",
      resetUrl,
    ),
    text: `Reset your MKR password: ${resetUrl} (expires in 30 minutes, one-time use). If you did not request this, ignore this email.`,
  };
}

// env import retained for future provider config surface (tree-shaken if unused)
void env;
