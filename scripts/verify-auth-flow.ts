import { eq, sql } from "drizzle-orm";
import { authenticateUser, createUser } from "../src/server/auth/users";
import { closeDb, getDb, schema } from "../src/server/db";

const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const email = `auth-check-${suffix}@gafcore.invalid`;
const password = `Check-${crypto.randomUUID()}-9`;
let userId: string | null = null;

try {
  const db = getDb();
  const existing = await db
    .select({
      total: sql<number>`count(*)::int`,
      admins: sql<number>`count(*) filter (where ${schema.users.isAdmin})::int`,
      passwordHashes: sql<number>`count(*) filter (where ${schema.users.passwordHash} is not null and ${schema.users.passwordHash} <> '')::int`,
    })
    .from(schema.users);

  const created = await createUser({
    nombre: "Auth Check",
    email,
    password,
    celular: "0000000000",
    codigo_pais: "+52",
    nombre_negocio: "Auth Check",
    plan: "free",
  });
  userId = created.id;

  const authenticated = await authenticateUser(email, password);
  if (!authenticated || authenticated.id !== userId) {
    throw new Error("El login no devolvio la cuenta temporal.");
  }

  console.log(
    `PUBLIVENDE_AUTH=PASS|EXISTING_USERS=${existing[0]?.total ?? 0}|ADMINS=${existing[0]?.admins ?? 0}|PASSWORD_HASHES=${existing[0]?.passwordHashes ?? 0}|TEMP_CLEANUP=PASS`,
  );
} finally {
  if (userId) {
    await getDb().delete(schema.users).where(eq(schema.users.id, userId));
  }
  await closeDb();
}
