import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import { getDatabaseUrl, isProductionMode } from "../config";

let client: ReturnType<typeof postgres> | null = null;
let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!isProductionMode()) {
    throw new Error("Base de datos no configurada. Define DATABASE_URL y SESSION_SECRET.");
  }
  if (!db) {
    client = postgres(getDatabaseUrl(), { max: 10, prepare: false });
    db = drizzle(client, { schema });
  }
  return db;
}

export async function closeDb() {
  if (client) {
    await client.end();
    client = null;
    db = null;
  }
}

export { schema };
