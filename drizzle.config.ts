import type { Config } from "drizzle-kit";

/**
 * Drizzle Kit config — reads DATABASE_URL from the environment.
 * Never commit real database credentials here (previously a pooler URL
 * with a password was hardcoded in drizzle.config.json).
 */
export default {
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
} satisfies Config;
