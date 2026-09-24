import { drizzle } from "drizzle-orm/node-postgres";
import type { SQL } from "drizzle-orm";
import { pool } from "@/db";

/**
 * Shared Drizzle client. `rawQuery` is the escape hatch for read models that are
 * cheaper to express in SQL (joins + JSON aggregation) while still fully
 * parameterised — no string interpolation of user input ever happens.
 */
export const db = drizzle(pool);

export async function rawQuery<T>(query: SQL): Promise<T[]> {
  const result: unknown = await db.execute(query);
  if (Array.isArray(result)) return result as T[];
  const withRows = result as { rows?: T[] } | null;
  return withRows?.rows ?? [];
}

export async function rawOne<T>(query: SQL): Promise<T | null> {
  const rows = await rawQuery<T>(query);
  return rows[0] ?? null;
}

/** Wraps a DB call so infrastructure failures surface instead of becoming empty data. */
export class DataError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "DataError";
  }
}

export async function guarded<T>(label: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new DataError(`${label} failed: ${detail}`, error);
  }
}

export function isDataError(error: unknown): error is DataError {
  return error instanceof DataError;
}
