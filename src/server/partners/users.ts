import { eq, and } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import type { DbPartner, DbPartnerUser, DbUser } from "@/server/db/schema";
import { hashPassword } from "@/server/auth/crypto";

function partnerEmail(partnerSlug: string, externalUserId: string): string {
  const safe = externalUserId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
  return `partner+${partnerSlug}+${safe}@partners.publivende.local`;
}

export async function findPartnerBySlug(slug: string): Promise<DbPartner | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.partners)
    .where(and(eq(schema.partners.slug, slug), eq(schema.partners.activo, true)))
    .limit(1);
  return rows[0] ?? null;
}

export async function findPartnerById(partnerId: string): Promise<DbPartner | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.partners)
    .where(and(eq(schema.partners.id, partnerId), eq(schema.partners.activo, true)))
    .limit(1);
  return rows[0] ?? null;
}

export async function findPartnerUserByUserId(
  userId: string,
): Promise<{ partner: DbPartner; partnerUser: DbPartnerUser } | null> {
  const db = getDb();
  const rows = await db
    .select({ partner: schema.partners, partnerUser: schema.partnerUsers })
    .from(schema.partnerUsers)
    .innerJoin(schema.partners, eq(schema.partners.id, schema.partnerUsers.partnerId))
    .where(and(eq(schema.partnerUsers.userId, userId), eq(schema.partners.activo, true)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return row;
}

export async function findPartnerUser(
  partnerId: string,
  externalUserId: string,
): Promise<DbPartnerUser | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.partnerUsers)
    .where(
      and(
        eq(schema.partnerUsers.partnerId, partnerId),
        eq(schema.partnerUsers.externalUserId, externalUserId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function getPartnerUserWithProfile(
  partnerId: string,
  externalUserId: string,
): Promise<{ partnerUser: DbPartnerUser; user: DbUser } | null> {
  const db = getDb();
  const rows = await db
    .select({ partnerUser: schema.partnerUsers, user: schema.users })
    .from(schema.partnerUsers)
    .innerJoin(schema.users, eq(schema.users.id, schema.partnerUsers.userId))
    .where(
      and(
        eq(schema.partnerUsers.partnerId, partnerId),
        eq(schema.partnerUsers.externalUserId, externalUserId),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return row;
}

export async function upsertPartnerEndUser(
  partner: DbPartner,
  input: {
    external_user_id: string;
    nombre?: string;
    nombre_negocio?: string;
    celular?: string;
    codigo_pais?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<{ partnerUser: DbPartnerUser; user: DbUser; created: boolean }> {
  const db = getDb();
  const existing = await getPartnerUserWithProfile(partner.id, input.external_user_id);
  if (existing) {
    const updates: Partial<typeof schema.users.$inferInsert> = { updatedAt: new Date() };
    if (input.nombre) updates.nombre = input.nombre;
    if (input.nombre_negocio) updates.nombreNegocio = input.nombre_negocio;
    if (input.celular) updates.celular = input.celular;
    if (input.codigo_pais) updates.codigoPais = input.codigo_pais;

    const userRows = await db
      .update(schema.users)
      .set(updates)
      .where(eq(schema.users.id, existing.user.id))
      .returning();

    if (input.metadata) {
      await db
        .update(schema.partnerUsers)
        .set({ metadata: input.metadata, updatedAt: new Date() })
        .where(eq(schema.partnerUsers.id, existing.partnerUser.id));
    }

    return {
      partnerUser: existing.partnerUser,
      user: userRows[0] ?? existing.user,
      created: false,
    };
  }

  const email = partnerEmail(partner.slug, input.external_user_id);
  const passwordHash = await hashPassword(randomInternalPassword());
  const userRows = await db
    .insert(schema.users)
    .values({
      email,
      passwordHash,
      nombre: input.nombre ?? input.external_user_id,
      nombreNegocio: input.nombre_negocio ?? partner.brandName,
      celular: input.celular ?? "",
      codigoPais: input.codigo_pais ?? "+52",
    })
    .returning();

  const user = userRows[0]!;

  const puRows = await db
    .insert(schema.partnerUsers)
    .values({
      partnerId: partner.id,
      userId: user.id,
      externalUserId: input.external_user_id,
      metadata: input.metadata,
    })
    .returning();

  return { partnerUser: puRows[0]!, user, created: true };
}

function randomInternalPassword(): string {
  return `pv_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

export function isReturnUrlAllowed(partner: DbPartner, returnUrl: string): boolean {
  try {
    const origin = new URL(returnUrl).origin;
    const allowed = partner.allowedReturnOrigins ?? [];
    if (!allowed.length) return true;
    return allowed.includes(origin);
  } catch {
    return false;
  }
}
