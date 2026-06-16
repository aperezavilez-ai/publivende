import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import * as schema from "../src/server/db/schema";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL requerida");
  process.exit(1);
}

const client = postgres(url, { max: 1 });
const db = drizzle(client, { schema });

async function main() {
  console.log("Aplicando migraciones…");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Listo.");
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
