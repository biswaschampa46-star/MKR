/** One-shot runner for supabase/migrations/20260912_product_clothing_system.sql */
import "dotenv/config";
import { readFileSync } from "fs";
import { Client } from "pg";

async function main() {
  const sql = readFileSync("supabase/migrations/20260912_product_clothing_system.sql", "utf8");
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  await c.query(sql);
  const cols = await c.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'products' ORDER BY ordinal_position",
  );
  console.log("columns now:", cols.rows.map((r) => r.column_name).join(", "));
  const n = await c.query("SELECT count(*)::int AS n FROM products");
  console.log("existing products:", n.rows[0].n);
  await c.end();
}

main().catch((err) => {
  console.error("migration failed:", err.message);
  process.exit(1);
});