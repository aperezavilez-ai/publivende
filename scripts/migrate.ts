import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import { Pool } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/publivende";

async function main() {
  const pool = new Pool({ connectionString });
  const db = drizzle(pool);

  console.log("⏳ Running migrations...");

  await migrate(db, { migrationsFolder: "drizzle" });

  console.log("✅ Migrations completed!");

  await pool.end();
}

main().catch((err) => {
  console.error("❌ Migration failed!");
  console.error(err);
  process.exit(1);
});
