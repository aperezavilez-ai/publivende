import { drizzle as drizzlePgProxy, type PgRemoteDatabase } from "drizzle-orm/pg-proxy";
import { drizzle as drizzlePostgres, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { isProductionMode } from "../config";

type ProxyResponse = { rows?: unknown[][]; error?: string };

let db: any = null;
let pgClient: postgres.Sql | null = null;

function proxyConfiguration() {
  const baseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!baseUrl || !serviceRoleKey) {
    throw new Error("Base de datos no configurada. Define SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.");
  }
  return { url: `${baseUrl}/functions/v1/publivende-sql`, serviceRoleKey };
}

async function remoteQuery(sql: string, params: unknown[] = []) {
  const { url, serviceRoleKey } = proxyConfiguration();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql, params }),
    cache: "no-store",
  });
  const result = (await response.json().catch(() => ({}))) as ProxyResponse;
  if (!response.ok) throw new Error(result.error || `Supabase respondió ${response.status}.`);
  return result.rows ?? [];
}

export function getDb() {
  if (!isProductionMode()) {
    throw new Error("Base de datos no configurada. Define DATABASE_URL y SESSION_SECRET.");
  }
  if (!db) {
    const databaseUrl = process.env.DATABASE_URL;
    if (databaseUrl) {
      pgClient = postgres(databaseUrl, {
        max: 10,
        idle_timeout: 20,
        connect_timeout: 10,
      });
      db = drizzlePostgres(pgClient, { schema });
    } else {
      db = drizzlePgProxy(async (sql, params) => ({ rows: await remoteQuery(sql, params) }), { schema });
    }
  }
  return db;
}

export async function closeDb() {
  if (pgClient) {
    await pgClient.end();
    pgClient = null;
  }
  db = null;
}

export { schema };
