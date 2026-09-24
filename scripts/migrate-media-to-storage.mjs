#!/usr/bin/env node
/**
 * Phase 3 — media_assets bytea → Supabase Storage migration.
 *
 * Non-destructive and idempotent:
 *   • Finds rows where storage_provider = 'database' AND bytes IS NOT NULL.
 *   • Uploads each object to its configured bucket (verified with a HEAD check).
 *   • Flips storage_provider to 'supabase' and rewrites public_url
 *     (public URL for public buckets, NULL for the private profile-photos
 *     bucket — avatars are served through /api/media/avatar/{id} signed URLs).
 *   • NULLs the bytes column ONLY after a verified upload.
 *
 * Run:  node scripts/migrate-media-to-storage.mjs [--dry-run]
 * Env:  DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (from .env.local)
 *
 * Destructive cleanup of residual bytea data is intentionally NOT automatic.
 * After a verified run, optionally clear leftovers manually:
 *   update media_assets set bytes = null where storage_provider = 'supabase';
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { Client } from "pg";

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");

function readEnv(key) {
  if (process.env[key]) return process.env[key];
  try {
    const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    const line = text.split("\n").find((l) => l.trim().startsWith(`${key}=`));
    return line ? line.slice(key.length + 1).trim().replace(/^["']|["']$/g, "") : undefined;
  } catch {
    return undefined;
  }
}

const DATABASE_URL = readEnv("DATABASE_URL");
const SUPABASE_URL = readEnv("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_KEY = readEnv("SUPABASE_SERVICE_ROLE_KEY");

if (!DATABASE_URL || !SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing DATABASE_URL / NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const PUBLIC_BUCKETS = new Set(["uploads", "mkr-marketing-videos"]);

const pg = new Client({ connectionString: DATABASE_URL });
const storage = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  await pg.connect();
  const { rows } = await pg.query(
    `select id, bucket, storage_path, mime_type, bytes, role
       from media_assets
      where storage_provider = 'database' and bytes is not null
      order by created_at asc`,
  );
  if (rows.length === 0) {
    console.log("Nothing to migrate: no database-backed media found.");
    return;
  }
  console.log(`${rows.length} asset(s) to migrate${DRY_RUN ? " (dry run)" : ""}.`);

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    const label = `${row.id} (${row.bucket}/${row.storage_path})`;
    try {
      if (!row.bytes) {
        skipped++;
        continue;
      }
      const buffer = Buffer.from(row.bytes);

      if (DRY_RUN) {
        console.log(`  [dry-run] would upload ${label} — ${(buffer.byteLength / 1024).toFixed(1)} KB`);
        continue;
      }

      // Idempotent upload: upsert so a partially failed prior run can resume.
      const { error } = await storage.storage
        .from(row.bucket)
        .upload(row.storage_path, buffer, { contentType: row.mime_type, upsert: true });
      if (error) throw new Error(error.message);

      // Verify the object actually landed before touching the database row.
      const folder = row.storage_path.split("/").slice(0, -1).join("/");
      const name = row.storage_path.split("/").pop();
      const { data: listing } = await storage.storage.from(row.bucket).list(folder, { search: name, limit: 5 });
      if (!listing?.some((o) => o.name === name)) throw new Error("Upload verification failed");

      const publicUrl = PUBLIC_BUCKETS.has(row.bucket)
        ? storage.storage.from(row.bucket).getPublicUrl(row.storage_path).data.publicUrl
        : null; // private bucket (profile-photos) → served via /api/media/avatar/{id}

      await pg.query(
        `update media_assets
            set storage_provider = 'supabase',
                public_url = $2,
                bytes = null,
                metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('migratedAt', now(), 'migratedFrom', 'database')
          where id = $1`,
        [row.id, publicUrl],
      );
      migrated++;
      console.log(`  ✓ migrated ${label}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ FAILED ${label}: ${err.message}`);
    }
  }

  console.log(`\nDone. migrated=${migrated} skipped=${skipped} failed=${failed}${DRY_RUN ? " (dry run — nothing written)" : ""}`);
  if (failed > 0) process.exitCode = 2;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pg.end());
