import postgres from "postgres";
import { readFileSync } from "node:fs";

const env = readFileSync(".env", "utf8");
const m = env.match(/DATABASE_URL="([^"]+)"/);
if (!m) {
  console.error("DATABASE_URL no encontrada");
  process.exit(1);
}

const sql = postgres(m[1], { max: 1 });
const rows = await sql`
  SELECT
    id,
    user_id,
    estado,
    fecha_programada::text,
    fecha_publicacion::text,
    source_url,
    schedule_meta,
    redes_destino,
    created_at::text
  FROM posts
  WHERE user_id = 'eda8fded-4e65-46fd-822c-a917ec79e9a5'
  ORDER BY created_at DESC
  LIMIT 20
`;
console.log(JSON.stringify(rows, null, 2));
await sql.end();
