import { eq, and } from "drizzle-orm";
import type { Profile, Plan } from "@/lib/mock/types";
import { getDb, schema } from "../db";
import type { DbUser } from "../db/schema";
import { hashPassword, verifyPassword } from "./crypto";

export function dbUserToProfile(u: DbUser): Profile {
  return {
    id: u.id,
    nombre: u.nombre,
    email: u.email,
    password: "",
    celular: u.celular,
    codigo_pais: u.codigoPais,
    nombre_negocio: u.nombreNegocio,
    industria: u.industria ?? undefined,
    descripcion_negocio: u.descripcionNegocio ?? undefined,
    publico_objetivo: u.publicoObjetivo ?? undefined,
    tono_marca: u.tonoMarca ?? undefined,
    ciudad: u.ciudad ?? undefined,
    horario_atencion: u.horarioAtencion ?? undefined,
    pago_provider_default: u.pagoProviderDefault ?? undefined,
    plan: u.plan as Plan,
    is_admin: u.isAdmin,
    whatsapp_configurado: u.whatsappConfigurado,
    onboarding_completado: u.onboardingCompletado,
    fecha_registro: u.fechaRegistro.toISOString(),
  };
}

export async function findUserByEmail(email: string): Promise<DbUser | null> {
  const db = getDb();
  const rows = await db.select().from(schema.users).where(eq(schema.users.email, email.toLowerCase())).limit(1);
  return rows[0] ?? null;
}

export async function findUserById(id: string): Promise<DbUser | null> {
  const db = getDb();
  const rows = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createUser(input: {
  nombre: string;
  email: string;
  password: string;
  celular: string;
  codigo_pais: string;
  nombre_negocio: string;
  plan?: Plan;
}): Promise<DbUser> {
  const db = getDb();
  const passwordHash = await hashPassword(input.password);
  const rows = await db
    .insert(schema.users)
    .values({
      email: input.email.toLowerCase(),
      passwordHash,
      nombre: input.nombre,
      celular: input.celular,
      codigoPais: input.codigo_pais,
      nombreNegocio: input.nombre_negocio,
      plan: input.plan ?? "free",
    })
    .returning();
  return rows[0]!;
}

export async function authenticateUser(email: string, password: string): Promise<DbUser | null> {
  const user = await findUserByEmail(email);
  if (!user) return null;
  const ok = await verifyPassword(password, user.passwordHash);
  return ok ? user : null;
}

export async function updateUserProfile(userId: string, patch: Partial<Profile>): Promise<DbUser | null> {
  const db = getDb();
  const rows = await db
    .update(schema.users)
    .set({
      ...(patch.nombre !== undefined && { nombre: patch.nombre }),
      ...(patch.celular !== undefined && { celular: patch.celular }),
      ...(patch.codigo_pais !== undefined && { codigoPais: patch.codigo_pais }),
      ...(patch.nombre_negocio !== undefined && { nombreNegocio: patch.nombre_negocio }),
      ...(patch.industria !== undefined && { industria: patch.industria }),
      ...(patch.descripcion_negocio !== undefined && { descripcionNegocio: patch.descripcion_negocio }),
      ...(patch.publico_objetivo !== undefined && { publicoObjetivo: patch.publico_objetivo }),
      ...(patch.tono_marca !== undefined && { tonoMarca: patch.tono_marca }),
      ...(patch.ciudad !== undefined && { ciudad: patch.ciudad }),
      ...(patch.horario_atencion !== undefined && { horarioAtencion: patch.horario_atencion }),
      ...(patch.pago_provider_default !== undefined && { pagoProviderDefault: patch.pago_provider_default }),
      ...(patch.plan !== undefined && { plan: patch.plan }),
      ...(patch.whatsapp_configurado !== undefined && { whatsappConfigurado: patch.whatsapp_configurado }),
      ...(patch.onboarding_completado !== undefined && { onboardingCompletado: patch.onboarding_completado }),
      updatedAt: new Date(),
    })
    .where(eq(schema.users.id, userId))
    .returning();
  return rows[0] ?? null;
}

export async function upsertOAuthAccount(
  userId: string,
  data: {
    red: import("@/lib/mock/types").Red;
    nombre_cuenta: string;
    access_token: string;
    refresh_token?: string;
    token_expires_at?: string;
    external_account_id?: string;
    avatar?: string;
    oauth_provider?: "meta" | "google" | "tiktok";
  },
) {
  const db = getDb();
  const existing = await db
    .select()
    .from(schema.oauthAccounts)
    .where(and(eq(schema.oauthAccounts.userId, userId), eq(schema.oauthAccounts.red, data.red)))
    .limit(1);

  const values = {
    userId,
    red: data.red,
    nombreCuenta: data.nombre_cuenta,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    tokenExpiresAt: data.token_expires_at ? new Date(data.token_expires_at) : undefined,
    externalAccountId: data.external_account_id,
    avatar: data.avatar,
    oauthProvider: data.oauth_provider,
    estadoConexion: "conectada" as const,
    updatedAt: new Date(),
  };

  if (existing[0]) {
    await db.update(schema.oauthAccounts).set(values).where(eq(schema.oauthAccounts.id, existing[0].id));
  } else {
    await db.insert(schema.oauthAccounts).values(values);
  }
}

export async function getOAuthToken(userId: string, red: import("@/lib/mock/types").Red): Promise<string | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.oauthAccounts)
    .where(and(eq(schema.oauthAccounts.userId, userId), eq(schema.oauthAccounts.red, red)))
    .limit(1);
  const acc = rows[0];
  if (!acc || acc.estadoConexion !== "conectada") return null;
  if (acc.tokenExpiresAt && acc.tokenExpiresAt < new Date()) return null;
  return acc.accessToken;
}

export async function getOAuthAccount(userId: string, red: import("@/lib/mock/types").Red) {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.oauthAccounts)
    .where(and(eq(schema.oauthAccounts.userId, userId), eq(schema.oauthAccounts.red, red)))
    .limit(1);
  return rows[0] ?? null;
}
