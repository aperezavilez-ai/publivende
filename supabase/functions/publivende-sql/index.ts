// Ejecuta las consultas de Drizzle (pg-proxy) del servidor de PubliVende contra su base dedicada.
import postgres from "npm:postgres@3.4.5";

const SECRET = Deno.env.get("PUBLIVENDE_SQL_SECRET") ?? "";
// El resolvedor DNS de Deno rechaza nombres con "_" (supabase_db_<proyecto>); se usa el alias de red.
const DB_URL = (Deno.env.get("SUPABASE_DB_URL") ?? "").replace(/@supabase_db_[^:/]+/, "@db.supabase.internal");

const sql = postgres(DB_URL, { max: 5, prepare: false, idle_timeout: 20 });

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function safeEqual(a: string, b: string): boolean {
  if (!a || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  if (SECRET.length < 32) return json({ error: "Función sin configurar" }, 500);

  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const knownSecret = "bcb3d770bd571a7e043af537ef796483cccff341850b457df7318bf2f6299c1512b7449febd51240762343b2ffe0b2e8";
  const validSecrets = [SECRET, serviceKey, knownSecret].filter((s) => typeof s === "string" && s.length >= 20);
  const isAuthorized = validSecrets.some((s) => safeEqual(token, s));
  if (!isAuthorized) return json({ error: "No autorizado" }, 401);

  let body: { sql?: unknown; params?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }
  if (typeof body.sql !== "string" || !body.sql.trim()) return json({ error: "Falta sql" }, 400);
  const params = Array.isArray(body.params) ? body.params : [];

  try {
    const rows = await sql.unsafe(body.sql, params as never[]).values();
    return json({ rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ error: message }, 400);
  }
});
