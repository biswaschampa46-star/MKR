import "dotenv/config";
import { getDb } from "../src/db/index";
import { products } from "../src/db/schema";
import { eq } from "drizzle-orm";
async function main() {
  const db = getDb();
  const [p] = await db.select().from(products).where(eq(products.slug, "jama")).limit(1);
  const { id, ...rest } = p;
  console.log(JSON.stringify(rest, null, 1));
  process.exit(0);
}
main().catch(e => { console.error(String(e)); process.exit(1); });
