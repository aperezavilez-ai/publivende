import { eq } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import type { DbWhatsAppAccount } from "@/server/db/schema";
import { decryptSecret, encryptSecret } from "@/server/crypto/vault";
import { updateUserProfile } from "@/server/auth/users";

export interface WhatsAppCredentials {
  phoneNumberId: string;
  token: string;
  wabaId: string;
  displayPhoneNumber: string;
}

export type WhatsAppConnectMode = "none" | "link" | "api";

export interface WhatsAppAccountPublic {
  connected: boolean;
  mode: WhatsAppConnectMode;
  apiConnected: boolean;
  linkConnected: boolean;
  phoneNumberId?: string;
  displayPhoneNumber?: string;
  verifiedName?: string;
  wabaId?: string;
}

function toPublic(acc: DbWhatsAppAccount | null): WhatsAppAccountPublic {
  if (!acc || acc.estadoConexion !== "conectada") return { connected: false };
  return {
    connected: true,
    phoneNumberId: acc.phoneNumberId,
    displayPhoneNumber: acc.displayPhoneNumber,
    verifiedName: acc.verifiedName ?? undefined,
    wabaId: acc.wabaId,
  };
}

export async function getWhatsAppAccountByUserId(userId: string): Promise<DbWhatsAppAccount | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.whatsappAccounts)
    .where(eq(schema.whatsappAccounts.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getWhatsAppAccountPublic(userId: string): Promise<WhatsAppAccountPublic> {
  return toPublic(await getWhatsAppAccountByUserId(userId));
}

export async function getWhatsAppFullStatus(
  userId: string,
  profile: { celular: string; codigoPais: string; whatsappConfigurado: boolean },
): Promise<WhatsAppAccountPublic> {
  const api = toPublic(await getWhatsAppAccountByUserId(userId));
  if (api.apiConnected) return api;

  const hasPhone = profile.celular.replace(/\D/g, "").length >= 10;
  const linkConnected = profile.whatsappConfigurado && hasPhone;
  if (!linkConnected) return emptyPublic();

  const display = profile.celular.startsWith("+")
    ? profile.celular
    : `${profile.codigoPais} ${profile.celular}`.trim();

  return {
    connected: true,
    mode: "link",
    apiConnected: false,
    linkConnected: true,
    displayPhoneNumber: display,
  };
}

export async function findUserIdByPhoneNumberId(phoneNumberId: string): Promise<string | null> {
  const db = getDb();
  const rows = await db
    .select({ userId: schema.whatsappAccounts.userId })
    .from(schema.whatsappAccounts)
    .where(eq(schema.whatsappAccounts.phoneNumberId, phoneNumberId))
    .limit(1);
  return rows[0]?.userId ?? null;
}

export async function getWhatsAppCredentialsForUser(userId: string): Promise<WhatsAppCredentials | null> {
  const acc = await getWhatsAppAccountByUserId(userId);
  if (!acc || acc.estadoConexion !== "conectada") return null;
  if (acc.tokenExpiresAt && acc.tokenExpiresAt < new Date()) return null;
  return {
    phoneNumberId: acc.phoneNumberId,
    token: decryptSecret(acc.accessTokenEncrypted),
    wabaId: acc.wabaId,
    displayPhoneNumber: acc.displayPhoneNumber,
  };
}

export async function upsertWhatsAppAccount(
  userId: string,
  data: {
    wabaId: string;
    phoneNumberId: string;
    displayPhoneNumber: string;
    verifiedName?: string;
    accessToken: string;
    tokenExpiresAt?: Date;
  },
): Promise<DbWhatsAppAccount> {
  const db = getDb();
  const existing = await getWhatsAppAccountByUserId(userId);
  const values = {
    userId,
    wabaId: data.wabaId,
    phoneNumberId: data.phoneNumberId,
    displayPhoneNumber: data.displayPhoneNumber,
    verifiedName: data.verifiedName,
    accessTokenEncrypted: encryptSecret(data.accessToken),
    tokenExpiresAt: data.tokenExpiresAt,
    estadoConexion: "conectada" as const,
    updatedAt: new Date(),
  };

  let saved: DbWhatsAppAccount;
  if (existing) {
    const rows = await db
      .update(schema.whatsappAccounts)
      .set(values)
      .where(eq(schema.whatsappAccounts.id, existing.id))
      .returning();
    saved = rows[0]!;
  } else {
    const rows = await db.insert(schema.whatsappAccounts).values(values).returning();
    saved = rows[0]!;
  }

  await updateUserProfile(userId, { whatsapp_configurado: true });
  return saved;
}

export async function disconnectWhatsAppAccount(userId: string): Promise<void> {
  const db = getDb();
  await db.delete(schema.whatsappAccounts).where(eq(schema.whatsappAccounts.userId, userId));
  await updateUserProfile(userId, { whatsapp_configurado: false });
}
