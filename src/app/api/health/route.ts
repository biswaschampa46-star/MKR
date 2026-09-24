import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { storageMode } from "@/lib/storage";
import { supabaseAdminConfigured, supabasePublicConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

/* ---------- Secret-safe DB diagnostics (error path only) ----------
   Drizzle 0.45.2 wraps the real pg/driver failure in `DrizzleQueryError`,
   whose `message` is only "Failed query: …" while the underlying error lives
   on `cause`. These helpers surface a sanitized classification without ever
   exposing connection strings, passwords, or API keys. */

type DbErrorClass =
  | "auth"
  | "dns"
  | "refused"
  | "timeout"
  | "ssl"
  | "terminated"
  | "missing-database"
  | "unknown";

type ChainLink = { message: string; code: string | null };

/** Walks `error` + nested `cause` links (cycle-safe, depth-capped). */
function collectErrorChain(error: unknown): ChainLink[] {
  const chain: ChainLink[] = [];
  const seen = new Set<unknown>();
  let current: unknown = error;
  for (let depth = 0; depth < 6; depth += 1) {
    if (!current || (typeof current !== "object" && typeof current !== "function")) break;
    if (seen.has(current)) break;
    seen.add(current);
    const record = current as { message?: unknown; code?: unknown; cause?: unknown };
    chain.push({
      message: typeof record.message === "string" ? record.message : "",
      code: typeof record.code === "string" && record.code.length > 0 ? record.code.slice(0, 24) : null,
    });
    current = record.cause;
  }
  return chain;
}

function classifyDbError(chain: ChainLink[]): DbErrorClass {
  const codes = chain.map((link) => (link.code ?? "").toUpperCase());
  const text = chain
    .map((link) => link.message)
    .join(" ")
    .toLowerCase();
  const hasCode = (fragment: string) => codes.some((code) => code.includes(fragment));

  if (hasCode("28P01") || hasCode("28000") || text.includes("password authentication failed") || /role .* does not exist/.test(text)) {
    return "auth";
  }
  if (hasCode("3D000") || /database .* does not exist/.test(text)) return "missing-database";
  if (hasCode("ENOTFOUND") || hasCode("EAI_AGAIN") || text.includes("getaddrinfo") || text.includes("could not translate host") || text.includes("name or service not known")) {
    return "dns";
  }
  if (hasCode("ECONNREFUSED") || text.includes("connection refused")) return "refused";
  if (hasCode("ETIMEDOUT") || text.includes("timed out") || text.includes("timeout") || text.includes("connection timeout")) {
    return "timeout";
  }
  if (hasCode("CERT") || hasCode("TLS") || hasCode("SSL") || text.includes("ssl") || text.includes("tls") || text.includes("certificate")) {
    return "ssl";
  }
  if (hasCode("ECONNRESET") || hasCode("57P01") || text.includes("terminat") || text.includes("ended unexpectedly") || text.includes("connection reset")) {
    return "terminated";
  }
  return "unknown";
}

const CONNECTION_STRING_PATTERN = /postgres(?:ql)?:\/\/[^\s"'`]+/gi;
const JWT_PATTERN = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
const SUPABASE_KEY_PATTERN = /\bsb_(?:publishable|secret)_[A-Za-z0-9_-]+/g;
const PASSWORD_VALUE_PATTERN = /password\s*[:=]\s*(['"]?)[^\s,'";]+\1/gi;

/** Strips connection strings/tokens/password values, collapses whitespace, truncates. */
function sanitizeDetail(value: string, maxLength = 220): string {
  const cleaned = value
    .replace(CONNECTION_STRING_PATTERN, "postgres://[redacted]")
    .replace(JWT_PATTERN, "[redacted-token]")
    .replace(SUPABASE_KEY_PATTERN, "[redacted-key]")
    .replace(PASSWORD_VALUE_PATTERN, "password=[redacted]")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength - 1)}…` : cleaned;
}

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({
      ok: true,
      database: "connected",
      supabaseAuth: supabasePublicConfigured() ? "configured" : "not-configured",
      supabaseStorage: supabaseAdminConfigured() ? "configured" : "not-configured",
      mediaDriver: storageMode(),
    });
  } catch (error) {
    const chain = collectErrorChain(error);
    // Prefer the deepest concrete message over Drizzle's "Failed query" wrapper.
    const rawDetail =
      [...chain].reverse().find((link) => link.message.length > 0 && !link.message.startsWith("Failed query:"))?.message ??
      chain[0]?.message ??
      (typeof error === "string" ? error : "");
    return Response.json(
      {
        ok: false,
        database: "unavailable",
        error: error instanceof Error ? error.message : "Unknown database error",
        errorClass: classifyDbError(chain) satisfies DbErrorClass,
        errorCode: chain.find((link) => link.code)?.code ?? null,
        detail: sanitizeDetail(rawDetail.length > 0 ? rawDetail : "Unknown database error"),
      },
      { status: 500 },
    );
  }
}

