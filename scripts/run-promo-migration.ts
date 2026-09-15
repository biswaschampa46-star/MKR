import "dotenv/config";
import { readFileSync } from "fs";
import path from "path";
import { Pool } from "pg";

/**
 * One-off runner for scripts/promo-campaigns-migration.sql.
 * Additive only: IF NOT EXISTS everywhere, no existing table is touched.
 */
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL missing");

  const sql = readFileSync(
    path.join(process.cwd(), "scripts", "promo-campaigns-migration.sql"),
    "utf8",
  );

  const pool = new Pool({ connectionString: databaseUrl });
  try {
    await pool.query(sql);
    const { rows } = await pool.query<{ n: string }>(
      "select count(*)::text as n from promo_campaigns",
    );
    console.log("migration ok — promo_campaigns rows:", rows[0]?.n ?? "0");
  } finally {
    await pool.end();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("migration failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
