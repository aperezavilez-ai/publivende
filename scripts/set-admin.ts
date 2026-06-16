import postgres from "postgres";
import { readFileSync } from "node:fs";

const env = readFileSync(".env", "utf8");
const m = env.match(/DATABASE_URL="([^"]+)"/);
if (!m) process.exit(1);

const sql = postgres(m[1], { max: 1 });
await sql`UPDATE users SET is_admin = true WHERE email = 'aperezavilez@gmail.com'`;
const rows = await sql`SELECT email, nombre, is_admin FROM users`;
console.log(rows);
await sql.end();
