/**
 * Extracts table DDL (columns, defaults, constraints, indexes, enums) from the
 * live database using pg_catalog (pg_dump is unavailable on this machine).
 * Read-only. Output: supabase/migrations/0000_schema.sql
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import pg from "pg";

const url = (readFileSync(".env.local", "utf8").match(/DATABASE_URL=(.*)/) ?? [])[1]?.trim();
if (!url) { console.error("no DATABASE_URL"); process.exit(1); }
const OUT = "supabase/migrations";
mkdirSync(OUT, { recursive: true });

const c = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await c.connect();

const q = async (sql) => (await c.query(sql)).rows;

const enums = await q(
  `select t.typname, string_agg(e.enumlabel, ',' order by e.enumsortorder) as labels
     from pg_type t join pg_enum e on e.enumtypid = t.oid
    where t.typnamespace = 'public'::regnamespace
    group by t.typname order by t.typname`,
);
const tables = await q(
  `select c.relname, c.relkind
     from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
    order by c.relname`,
);

const formatDefault = (def) => {
  if (!def) return null;
  // Normalize nextval sequences
  const m = def.match(/nextval\('([^']+)'/);
  return def;
};

let out = `-- ═══════════════════════════════════════════════════════════════
-- 0000 — Schema: enums, tables, columns, constraints, indexes
-- Reconstructed verbatim from the live database's pg_catalog on
-- ${new Date().toISOString()} via scripts/extract-schema.mjs (read-only).
-- ═══════════════════════════════════════════════════════════════

`;

for (const e of enums) {
  out += `do $$ begin
  if not exists (select 1 from pg_type where typname = '${e.typname}' and typnamespace = 'public'::regnamespace) then
    create type public."${e.typname}" as enum (${e.labels.split(",").map((l) => `'${l}'`).join(", ")});
  end if;
end $$;\n`;
}
out += "\n";

for (const t of tables) {
  const name = t.relname;
  const cols = await q(
    `select a.attname, format_type(a.atttypid, a.atttypmod) as type, a.attnotnull,
            pg_get_expr(d.adbin, d.adrelid) as default_expr
       from pg_attribute a
       left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
      where a.attrelid = '"public"."${name}"'::regclass and a.attnum > 0 and not a.attisdropped
      order by a.attnum`,
  );
  out += `create table if not exists public."${name}" (\n`;
  out += cols
    .map((col) => {
      const nn = col.attnotnull ? " not null" : "";
      const dflt = col.default_expr ? ` default ${col.default_expr}` : "";
      return `  "${col.attname}" ${col.type}${nn}${dflt}`;
    })
    .join(",\n");
  out += "\n);\n\n";

  // Constraints
  const cons = await q(
    `select conname, contype, pg_get_constraintdef(oid) as def
       from pg_constraint
      where conrelid = '"public"."${name}"'::regclass
      order by contype, conname`,
  );
  for (const con of cons) {
    const kind =
      con.contype === "p" ? "primary key" : con.contype === "u" ? "unique" : con.contype === "f" ? "foreign key" : con.contype === "c" ? "check" : null;
    if (!kind) continue;
    out += `alter table public."${name}" add constraint "${con.conname}" ${kind} ${con.def.replace(/^FOREIGN KEY |^UNIQUE |^PRIMARY KEY |^CHECK /i, "")};\n`;
  }
  out += "\n";

  // Indexes (skip constraint-backed ones — created above)
  const idx = await q(
    `select i.relname as indexname, pg_get_indexdef(ix.indexrelid) as def
       from pg_index ix
       join pg_class i on i.oid = ix.indexrelid
      where ix.indrelid = '"public"."${name}"'::regclass and not ix.indisprimary
        and not exists (select 1 from pg_constraint cc where cc.conindid = ix.indexrelid)
      order by indexname`,
  );
  for (const i of idx) out += `${i.def};\n`;
  out += "\n";
}

writeFileSync(`${OUT}/0000_schema.sql`, out);
await c.end();
console.log("0000_schema.sql written:", tables.length, "tables,", enums.length, "enums");
