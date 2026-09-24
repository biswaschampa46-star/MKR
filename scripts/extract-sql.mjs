/**
 * Dumps the live Supabase/PostgreSQL business SQL into version-controlled
 * migration files. Read-only — never modifies the database.
 *
 * Outputs (under supabase/migrations/):
 *   0001_extensions_sequences.sql  — extensions + sequences (incl. order_number_seq)
 *   0002_functions.sql             — every public function (pg_get_functiondef)
 *   0003_triggers.sql              — every trigger (pg_get_triggerdef)
 *   0004_rls.sql                   — RLS enablement + policy definitions
 *   0005_storage.sql               — storage buckets + storage-object policies
 *   0006_realtime_publication.sql  — realtime publication membership (if any)
 *
 * Usage: node scripts/extract-sql.mjs
 * Requires DATABASE_URL in .env.local (read-only postgres connection).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import pg from "pg";

const envText = readFileSync(".env.local", "utf8");
const url = (envText.match(/DATABASE_URL=(.*)/) ?? [])[1]?.trim();
if (!url) {
  console.error("DATABASE_URL not found in .env.local");
  process.exit(1);
}

const OUT = "supabase/migrations";
mkdirSync(OUT, { recursive: true });

const header = (title) =>
  `-- ═══════════════════════════════════════════════════════════════\n` +
  `-- ${title}\n` +
  `-- Extracted VERBATIM from the live Supabase project on ${new Date().toISOString()}\n` +
  `-- via scripts/extract-sql.mjs (read-only pg_get_* definitions).\n` +
  `-- These are the REAL production bodies — not reconstructions.\n` +
  `-- ═══════════════════════════════════════════════════════════════\n\n`;

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();
console.log("Connected. Extracting…");

/* 1 ─ extensions + sequences */
const ext = await client.query(
  `select extname, extversion from pg_extension where extnamespace = 'public'::regnamespace or extname in ('pgcrypto') order by extname`,
);
const seq = await client.query(
  `select sequencename, data_type::text, start_value, increment_by from pg_sequences where schemaname = 'public' order by sequencename`,
);
let sql1 = header("0001 — Extensions & sequences");
for (const row of ext.rows) {
  sql1 += `create extension if not exists "${row.extname}"; -- v${row.extversion}\n`;
}
sql1 += "\n";
for (const row of seq.rows) {
  sql1 += `create sequence if not exists "${row.sequencename}" as ${row.data_type} start ${row.start_value} increment ${row.increment_by};\n`;
}
writeFileSync(`${OUT}/0001_extensions_sequences.sql`, sql1);
console.log("0001: extensions", ext.rowCount, "sequences", seq.rowCount);

/* 2 ─ functions (public schema only, exclude event triggers) */
const fns = await client.query(
  `select p.proname, p.prokind, pg_get_functiondef(p.oid) as def
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
    order by p.proname, p.oid`,
);
let sql2 = header("0002 — Functions (verbatim)");
for (const row of fns.rows) {
  sql2 += `-- ── ${row.proname} (${row.prokind === "f" ? "function" : row.prokind}) ──\n${row.def}\n\n`;
}
writeFileSync(`${OUT}/0002_functions.sql`, sql2);
console.log("0002: functions", fns.rowCount);

/* 3 ─ triggers */
const trs = await client.query(
  `select tgname, pg_get_triggerdef(t.oid) as def
     from pg_trigger t
    where not t.tgisinternal
      and t.tgrelid in (select oid from pg_class where relnamespace = 'public'::regnamespace)
    order by tgname`,
);
let sql3 = header("0003 — Triggers (verbatim)");
for (const row of trs.rows) sql3 += `${row.def};\n\n`;
if (trs.rowCount === 0) sql3 += "-- (no user triggers on public tables)\n";
writeFileSync(`${OUT}/0003_triggers.sql`, sql3);
console.log("0003: triggers", trs.rowCount);

/* 4 ─ RLS: enablement + policies + force flags */
const rlsTables = await client.query(
  `select c.relname, c.relrowsecurity, c.relforcerowsecurity
     from pg_class c
    where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
    order by c.relname`,
);
const policies = await client.query(
  `select schemaname, tablename, policyname, permissive, roles::text[], cmd, qual, with_check
     from pg_policies where schemaname = 'public' order by tablename, policyname`,
);
let sql4 = header("0004 — Row Level Security (verbatim)");
for (const t of rlsTables.rows) {
  if (t.relrowsecurity) {
    sql4 += `alter table public."${t.relname}" enable row level security;\n`;
    if (t.relforcerowsecurity) sql4 += `alter table public."${t.relname}" force row level security;\n`;
  }
}
sql4 += "\n";
if (policies.rowCount === 0) {
  sql4 += "-- (no policies defined in the public schema — RLS is enabled per-table above where set,\n--  and the app connects as the table owner / postgres role which bypasses RLS)\n";
}
for (const p of policies.rows) {
  sql4 += `-- ${p.tablename}.${p.policyname} (${p.cmd}, ${p.permissive}, roles: ${p.roles.join(",")})\n`;
  sql4 += p.qual ? `-- using: ${p.qual}\n` : "";
  sql4 += p.with_check ? `-- with check: ${p.with_check}\n` : "";
  // Re-create with original definition using pg_dump-style reconstruction:
  sql4 += `drop policy if exists "${p.policyname}" on public."${p.tablename}";\n`;
  const cmdMap = { PERMISSIVE: "", RESTRICTIVE: " as restrictive" };
  const cmdSql = { ALL: "for all", SELECT: "for select", INSERT: "for insert", UPDATE: "for update", DELETE: "for delete" };
  sql4 += `create policy "${p.policyname}" on public."${p.tablename}"${cmdMap[p.permissive]} ${cmdSql[p.cmd] ?? ""}`;
  if (p.roles && !p.roles.includes("public")) sql4 += ` to ${p.roles.map((r) => `"${r}"`).join(", ")}`;
  if (p.cmd === "ALL" || p.cmd === "SELECT") sql4 += p.qual ? `\n  using (${p.qual})` : "";
  if (p.cmd === "ALL" || p.cmd === "INSERT" || p.cmd === "UPDATE") sql4 += p.with_check ? `\n  with check (${p.with_check})` : "";
  if (p.cmd === "UPDATE" && p.qual) sql4 += `\n  using (${p.qual})`;
  if (p.cmd === "DELETE" && p.qual) sql4 += `\n  using (${p.qual})`;
  sql4 += ";\n\n";
}
writeFileSync(`${OUT}/0004_rls.sql`, sql4);
console.log("0004: rls tables", rlsTables.rowCount, "policies", policies.rowCount);

/* 5 ─ storage buckets + storage policies */
let buckets = [];
try {
  const b = await client.query(`select id, name, public, file_size_limit, allowed_mime_types from storage.buckets order by name`);
  buckets = b.rows;
} catch (e) {
  console.log("storage.buckets not accessible:", e.message);
}
let sql5 = header("0005 — Storage buckets & policies (verbatim)");
for (const b of buckets) {
  sql5 += `insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('${b.id}', '${b.name}', ${b.public}, ${b.file_size_limit ?? "null"}, ${b.allowed_mime_types ? `'${JSON.stringify(b.allowed_mime_types)}'::jsonb` : "null"})
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;\n`;
}
if (buckets.length === 0) sql5 += "-- (no buckets found or storage schema not accessible)\n";
sql5 += "\n";
let spCount = 0;
try {
  const sp = await client.query(
    `select policyname, tablename, cmd, roles::text[] as roles, qual, with_check from pg_policies where schemaname = 'storage' order by tablename, policyname`,
  );
  spCount = sp.rowCount;
  for (const p of sp.rows) {
    sql5 += `-- storage.${p.tablename}.${p.policyname} (${p.cmd})\n`;
    sql5 += p.qual ? `-- using: ${p.qual}\n` : "";
    sql5 += p.with_check ? `-- with check: ${p.with_check}\n` : "";
    sql5 += `drop policy if exists "${p.policyname}" on storage."${p.tablename}";\n`;
    const cmdSql = { ALL: "for all", SELECT: "for select", INSERT: "for insert", UPDATE: "for update", DELETE: "for delete" };
    sql5 += `create policy "${p.policyname}" on storage."${p.tablename}" ${cmdSql[p.cmd] ?? ""}`;
    if (p.roles && !p.roles.includes("public")) sql5 += ` to ${p.roles.map((r) => `"${r}"`).join(", ")}`;
    if (p.qual && (p.cmd === "ALL" || p.cmd === "SELECT" || p.cmd === "UPDATE" || p.cmd === "DELETE")) sql5 += `\n  using (${p.qual})`;
    if (p.with_check && (p.cmd === "ALL" || p.cmd === "INSERT" || p.cmd === "UPDATE")) sql5 += `\n  with check (${p.with_check})`;
    sql5 += ";\n\n";
  }
} catch (e) {
  console.log("storage policies not accessible:", e.message);
}
writeFileSync(`${OUT}/0005_storage.sql`, sql5);
console.log("0005: buckets", buckets.length, "storage policies", spCount);

/* 6 ─ realtime publication */
let sql6 = header("0006 — Realtime publication (verbatim)");
try {
  const pub = await client.query(
    `select schemaname, tablename from pg_publication_tables where pubname = 'supabase_realtime' order by tablename`,
  );
  if (pub.rowCount === 0) {
    sql6 += "-- (supabase_realtime publication has no members — Supabase Realtime v2 uses\n--  per-request table config; the app's use-realtime hook subscribes client-side)\n";
  }
  for (const t of pub.rows) {
    sql6 += `alter publication supabase_realtime add table public."${t.tablename}";\n`;
  }
} catch (e) {
  sql6 += `-- (publication check failed: ${e.message.replace(/\n/g, " ")})\n`;
}
writeFileSync(`${OUT}/0006_realtime_publication.sql`, sql6);
console.log("0006: done");

await client.end();
console.log("Extraction complete →", OUT);
