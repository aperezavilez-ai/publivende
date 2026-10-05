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
const key = env.SUPABASE_SERVICE_ROLE_KEY;
const bases = process.argv.slice(2).length ? process.argv.slice(2) : [env.SUPABASE_URL ?? ""];
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
  console.log("  usuarios →", await q(url, "select email, is_admin, plan from users order by fecha_registro"));
}
