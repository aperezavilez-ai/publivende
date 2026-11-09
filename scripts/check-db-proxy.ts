/** Diagnóstico de la conexión a la base por la función publivende-sql: `npx tsx scripts/check-db-proxy.ts [url-base...]` */
import { readFileSync } from "node:fs";

function readEnv(file: string): Record<string, string> {
  try {
    return Object.fromEntries(
      readFileSync(file, "utf8")
        .split(/\r?\n/)
        .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/))
        .filter((m): m is RegExpMatchArray => !!m)
        .map((m) => [m[1], m[2]]),
    );
  } catch {
    return {};
  }
}

const env = { ...readEnv(".env"), ...readEnv(".env.local"), ...process.env } as Record<string, string>;
const key = env.PUBLIVENDE_SQL_SECRET || "bcb3d770bd571a7e043af537ef796483cccff341850b457df7318bf2f6299c1512b7449febd51240762343b2ffe0b2e8";
const bases = process.argv.slice(2).length ? process.argv.slice(2) : [env.PUBLIVENDE_SUPABASE_URL || "https://publivende.gafcore.com"];
if (!key || !bases[0]) {
  console.error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

async function q(url: string, sql: string, params: unknown[] = []) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({ sql, params }),
      signal: AbortSignal.timeout(20000),
    });
    return { status: res.status, body: (await res.text()).slice(0, 400) };
  } catch (err) {
    return { status: 0, body: err instanceof Error ? err.message : String(err) };
  }
}

for (const base of bases) {
  const url = `${base.replace(/\/$/, "")}/functions/v1/publivende-sql`;
  console.log("\nProxy:", url);
  const ping = await q(url, "select 1");
  console.log("  select 1 →", ping);
  if (ping.status !== 200) continue;
  console.log("  tables →", await q(url, "select table_name from information_schema.tables where table_schema='public'"));
  console.log("  usuarios →", await q(url, "select id, email, is_admin, plan from users order by fecha_registro"));
  console.log("  findUser query →", await q(
    url,
    'select "id", "email", "password_hash", "nombre", "celular", "codigo_pais", "nombre_negocio", "industria", "descripcion_negocio", "publico_objetivo", "tono_marca", "ciudad", "horario_atencion", "pago_provider_default", "plan", "stripe_customer_id", "stripe_subscription_id", "plan_status", "plan_renews_at", "is_admin", "whatsapp_configurado", "onboarding_completado", "fecha_registro", "created_at", "updated_at" from "users" where "users"."email" = $1 limit $2',
    ["aperezavilez@gmail.com", 1]
  ));
}

import { findUserByEmail } from "../src/server/auth/users";

const found = await findUserByEmail("aperezavilez@gmail.com");
console.log("\nfindUserByEmail result:", found ? { id: found.id, email: found.email, name: found.nombre, plan: found.plan } : null);
