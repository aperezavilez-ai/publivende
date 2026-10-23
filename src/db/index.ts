import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/publivende";

const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });

export * from "./schema";
