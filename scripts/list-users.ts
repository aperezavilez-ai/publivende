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
  SELECT email, nombre, nombre_negocio, is_admin, fecha_registro::text
  FROM users
  ORDER BY fecha_registro
`;
console.log(JSON.stringify(rows, null, 2));
await sql.end();
