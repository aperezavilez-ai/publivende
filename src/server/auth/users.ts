import { eq, and } from "drizzle-orm";
import type { Profile, Plan } from "@/lib/mock/types";
import { getDb, schema } from "../db";
import type { DbUser } from "../db/schema";
import { hashPassword, verifyPassword } from "./crypto";
import { encryptSecret, decryptSecretLenient } from "../crypto/vault";

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
    plan: (u.isAdmin ? "business" : u.plan) as Plan,
    is_admin: u.isAdmin,
    whatsapp_configurado: u.whatsappConfigurado,
    onboarding_completado: u.onboardingCompletado,
    fecha_registro: u.fechaRegistro.toISOString(),
  };
}

/** Los administradores de la plataforma no tienen límites: siempre operan con el plan más alto. */
function withEffectivePlan(u: DbUser | undefined): DbUser | null {
  if (!u) return null;
  return u.isAdmin ? { ...u, plan: "business" } : u;
}

function getSupabaseRestConfig() {
  const url = (
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    "https://ckimjzfajaihaeqfgtoj.supabase.co"
  ).replace(/\/$/, "");

  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNraW1qemZhamFpaGFlcWZndG9qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI5NDUwOCwiZXhwIjoyMDk2ODcwNTA4fQ.aKN4LeFNB1fRsNEQxmKTP7pU00Zqh7DzUAW0YsaddIo";

  return { url, key };
}

function rowToDbUser(r: Record<string, any>): DbUser {
  return {
    id: r.id,
    email: r.email,
    passwordHash: r.password_hash ?? r.passwordHash ?? "",
    nombre: r.nombre ?? "",
    celular: r.celular ?? "",
    codigoPais: r.codigo_pais ?? r.codigoPais ?? "+52",
    nombreNegocio: r.nombre_negocio ?? r.nombreNegocio ?? "",
    industria: r.industria ?? null,
    descripcionNegocio: r.descripcion_negocio ?? r.descripcionNegocio ?? null,
    publicoObjetivo: r.publico_objetivo ?? r.publicoObjetivo ?? null,
    tonoMarca: r.tono_marca ?? r.tonoMarca ?? null,
    ciudad: r.ciudad ?? null,
    horarioAtencion: r.horario_atencion ?? r.horarioAtencion ?? null,
    pagoProviderDefault: r.pago_provider_default ?? r.pagoProviderDefault ?? null,
    plan: r.plan ?? "free",
    stripeCustomerId: r.stripe_customer_id ?? r.stripeCustomerId ?? null,
    stripeSubscriptionId: r.stripe_subscription_id ?? r.stripeSubscriptionId ?? null,
    planStatus: r.plan_status ?? r.planStatus ?? null,
    planRenewsAt: r.plan_renews_at ? new Date(r.plan_renews_at) : null,
    isAdmin: !!(r.is_admin ?? r.isAdmin),
    whatsappConfigurado: !!(r.whatsapp_configurado ?? r.whatsappConfigurado),
    onboardingCompletado: !!(r.onboarding_completado ?? r.onboardingCompletado),
    fechaRegistro: r.fecha_registro ? new Date(r.fecha_registro) : new Date(),
    createdAt: r.created_at ? new Date(r.created_at) : new Date(),
    updatedAt: r.updated_at ? new Date(r.updated_at) : new Date(),
  };
}

async function findUserViaRest(queryParam: string): Promise<DbUser | null> {
  const { url, key } = getSupabaseRestConfig();
  if (!url || !key) return null;
  try {
    const res = await fetch(`${url}/rest/v1/users?${queryParam}&select=*&limit=1`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as Record<string, any>[];
    if (rows && rows.length > 0) return rowToDbUser(rows[0]);
    return null;
  } catch (err) {
    console.warn("[findUserViaRest] failed, falling back to db", err);
    return null;
  }
}

export async function findUserByEmail(email: string): Promise<DbUser | null> {
  const norm = email.toLowerCase().trim();
  const fromRest = await findUserViaRest(`email=eq.${encodeURIComponent(norm)}`);
  if (fromRest) return withEffectivePlan(fromRest);

  try {
    const db = getDb();
    const rows = await db.select().from(schema.users).where(eq(schema.users.email, norm)).limit(1);
    return withEffectivePlan(rows[0]);
  } catch (err) {
    console.error("[findUserByEmail db error]", err);
    return null;
  }
}

export async function findUserById(id: string): Promise<DbUser | null> {
  const fromRest = await findUserViaRest(`id=eq.${encodeURIComponent(id)}`);
  if (fromRest) return withEffectivePlan(fromRest);

  try {
    const db = getDb();
    const rows = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
    return withEffectivePlan(rows[0]);
  } catch (err) {
    console.error("[findUserById db error]", err);
    return null;
  }
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
  const passwordHash = await hashPassword(input.password);
  const emailNorm = input.email.toLowerCase().trim();
  const { url, key } = getSupabaseRestConfig();

  if (url && key) {
    try {
      const res = await fetch(`${url}/rest/v1/users`, {
        method: "POST",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          email: emailNorm,
          password_hash: passwordHash,
          nombre: input.nombre,
          celular: input.celular,
          codigo_pais: input.codigo_pais,
          nombre_negocio: input.nombre_negocio,
          plan: input.plan ?? "free",
        }),
      });
      if (res.ok) {
        const rows = (await res.json()) as Record<string, any>[];
        if (rows && rows[0]) return rowToDbUser(rows[0]);
      }
    } catch (err) {
      console.warn("[createUser via rest failed, trying db]", err);
    }
  }

  const db = getDb();
  const rows = await db
    .insert(schema.users)
    .values({
      email: emailNorm,
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
  const { url, key } = getSupabaseRestConfig();
  if (url && key) {
    try {
      const updateBody: Record<string, any> = { updated_at: new Date().toISOString() };
      if (patch.nombre !== undefined) updateBody.nombre = patch.nombre;
      if (patch.celular !== undefined) updateBody.celular = patch.celular;
      if (patch.codigo_pais !== undefined) updateBody.codigo_pais = patch.codigo_pais;
      if (patch.nombre_negocio !== undefined) updateBody.nombre_negocio = patch.nombre_negocio;
      if (patch.industria !== undefined) updateBody.industria = patch.industria;
      if (patch.descripcion_negocio !== undefined) updateBody.descripcion_negocio = patch.descripcion_negocio;
      if (patch.publico_objetivo !== undefined) updateBody.publico_objetivo = patch.publico_objetivo;
      if (patch.tono_marca !== undefined) updateBody.tono_marca = patch.tono_marca;
      if (patch.ciudad !== undefined) updateBody.ciudad = patch.ciudad;
      if (patch.horario_atencion !== undefined) updateBody.horario_atencion = patch.horario_atencion;
      if (patch.pago_provider_default !== undefined) updateBody.pago_provider_default = patch.pago_provider_default;
      if (patch.plan !== undefined) updateBody.plan = patch.plan;
      if (patch.whatsapp_configurado !== undefined) updateBody.whatsapp_configurado = patch.whatsapp_configurado;
      if (patch.onboarding_completado !== undefined) updateBody.onboarding_completado = patch.onboarding_completado;

      const res = await fetch(`${url}/rest/v1/users?id=eq.${encodeURIComponent(userId)}`, {
        method: "PATCH",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify(updateBody),
      });
      if (res.ok) {
        const rows = (await res.json()) as Record<string, any>[];
        if (rows && rows[0]) return rowToDbUser(rows[0]);
      }
    } catch (err) {
      console.warn("[updateUserProfile via rest failed, trying db]", err);
    }
  }

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

export async function setUserBilling(
  userId: string,
  billing: {
    plan?: Plan;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    planStatus?: string | null;
    planRenewsAt?: Date | null;
  },
): Promise<void> {
  const db = getDb();
  await db
    .update(schema.users)
    .set({ ...billing, updatedAt: new Date() })
    .where(eq(schema.users.id, userId));
}

export async function findUserByStripeCustomerId(customerId: string): Promise<DbUser | null> {
  const db = getDb();
  const rows = await db.select().from(schema.users).where(eq(schema.users.stripeCustomerId, customerId)).limit(1);
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
    accessToken: encryptSecret(data.access_token),
    refreshToken: data.refresh_token ? encryptSecret(data.refresh_token) : undefined,
    tokenExpiresAt: data.token_expires_at ? new Date(data.token_expires_at) : undefined,
    externalAccountId: data.external_account_id,
    avatar: data.avatar,
    oauthProvider: data.oauth_provider,
    estadoConexion: "conectada" as const,
    metricsError: null,
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
  return acc.accessToken ? decryptSecretLenient(acc.accessToken) : null;
}

export async function getOAuthAccount(userId: string, red: import("@/lib/mock/types").Red) {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.oauthAccounts)
    .where(and(eq(schema.oauthAccounts.userId, userId), eq(schema.oauthAccounts.red, red)))
    .limit(1);
  const acc = rows[0];
  if (!acc) return null;
  return {
    ...acc,
    accessToken: acc.accessToken ? decryptSecretLenient(acc.accessToken) : acc.accessToken,
    refreshToken: acc.refreshToken ? decryptSecretLenient(acc.refreshToken) : acc.refreshToken,
  };
}
