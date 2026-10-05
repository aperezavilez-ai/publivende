/** Compara las columnas de `src/server/db/schema.ts` con la base: `DATABASE_URL=... npx tsx scripts/check-schema-drift.ts` */
import postgres from "postgres";
import { getTableConfig, PgTable } from "drizzle-orm/pg-core";
import * as schema from "../src/server/db/schema";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL requerida");
  process.exit(1);
}

const sql = postgres(url, { max: 1 });
const rows = await sql<{ table_name: string; column_name: string }[]>`
  select table_name, column_name from information_schema.columns where table_schema = 'public'
`;
const dbCols = new Set(rows.map((r) => `${r.table_name}.${r.column_name}`));

let missing = 0;
for (const value of Object.values(schema)) {
  if (!(value instanceof PgTable)) continue;
  const cfg = getTableConfig(value);
  for (const col of cfg.columns) {
    if (!dbCols.has(`${cfg.name}.${col.name}`)) {
      console.log(`FALTA ${cfg.name}.${col.name}`);
      missing++;
    }
  }
}
console.log(missing ? `${missing} columnas faltantes` : "Esquema completo: todas las columnas existen");
await sql.end();
process.exit(missing ? 1 : 0);
