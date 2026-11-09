import { and, eq } from "drizzle-orm";
import { encryptSecret, decryptSecretLenient } from "@/server/crypto/vault";

import { getDb, schema } from "@/server/db";
import type { hubChannels } from "@/server/db/schema";
import { refreshGoogle, refreshTikTok, RefreshRejected } from "@/server/auth/token-refresh";
import { normalizeNicho } from "@/lib/red/limits";
import type { Red } from "@/lib/mock/types";

export type DbHubChannel = typeof hubChannels.$inferSelect;

export interface HubChannelInput {
  red: Red;
  externalAccountId: string;
  nombre: string;
  avatar?: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  oauthProvider: "meta" | "google" | "tiktok";
}

/** Alta o reconexión de una cuenta oficial; conserva nichos y estado activo si ya existía. */
export async function upsertHubChannel(input: HubChannelInput): Promise<DbHubChannel> {
  const db = getDb();
  const existing = await db
    .select()
    .from(schema.hubChannels)
    .where(and(eq(schema.hubChannels.red, input.red), eq(schema.hubChannels.externalAccountId, input.externalAccountId)))
    .limit(1);

  const values = {
    nombre: input.nombre,
    avatar: input.avatar ?? null,
    accessToken: encryptSecret(input.accessToken),
    refreshToken: input.refreshToken ? encryptSecret(input.refreshToken) : (existing[0]?.refreshToken ?? null),
    tokenExpiresAt: input.tokenExpiresAt ?? null,
    oauthProvider: input.oauthProvider,
    estadoConexion: "conectada",
    error: null,
    updatedAt: new Date(),
  };

  if (existing[0]) {
    const rows = await db
      .update(schema.hubChannels)
      .set(values)
      .where(eq(schema.hubChannels.id, existing[0].id))
      .returning();
    return rows[0]!;
  }

  const rows = await db
    .insert(schema.hubChannels)
    .values({ ...values, red: input.red, externalAccountId: input.externalAccountId })
    .returning();
  return rows[0]!;
}

export async function listHubChannels(): Promise<DbHubChannel[]> {
  const rows = await getDb().select().from(schema.hubChannels).orderBy(schema.hubChannels.createdAt);
  return rows.map((r) => ({
    ...r,
    accessToken: r.accessToken ? decryptSecretLenient(r.accessToken) : r.accessToken,
    refreshToken: r.refreshToken ? decryptSecretLenient(r.refreshToken) : r.refreshToken,
  }));
}

export async function updateHubChannel(id: string, patch: { nichos?: string[]; activo?: boolean }) {
  const nichos = patch.nichos
    ? [...new Set(patch.nichos.map(normalizeNicho).filter(Boolean))]
    : undefined;
  await getDb()
    .update(schema.hubChannels)
    .set({ ...(nichos ? { nichos } : {}), ...(patch.activo === undefined ? {} : { activo: patch.activo }), updatedAt: new Date() })
    .where(eq(schema.hubChannels.id, id));
}

export async function deleteHubChannel(id: string) {
  await getDb().delete(schema.hubChannels).where(eq(schema.hubChannels.id, id));
}

const REFRESH_MARGIN_MS = 5 * 60 * 1000;

/** Token vigente de la cuenta oficial; renueva Google/TikTok si está por vencer. */
export async function getFreshHubToken(channel: DbHubChannel): Promise<string | null> {
  if (channel.estadoConexion !== "conectada") return null;
  const accessToken = channel.accessToken ? decryptSecretLenient(channel.accessToken) : channel.accessToken;
  const refreshToken = channel.refreshToken ? decryptSecretLenient(channel.refreshToken) : channel.refreshToken;
  if (!channel.tokenExpiresAt || channel.tokenExpiresAt.getTime() - Date.now() > REFRESH_MARGIN_MS) {
    return accessToken;
  }
  if (!refreshToken || channel.oauthProvider === "meta") {
    await markHubExpired(channel.id, "El acceso expiró. Vuelve a conectar la cuenta.");
    return null;
  }
  try {
    const fresh =
      channel.oauthProvider === "google"
        ? await refreshGoogle(refreshToken)
        : await refreshTikTok(refreshToken);
    await getDb()
      .update(schema.hubChannels)
      .set({
        accessToken: encryptSecret(fresh.accessToken),
        refreshToken: encryptSecret(fresh.refreshToken ?? refreshToken),
        tokenExpiresAt: fresh.expiresAt ?? null,
        updatedAt: new Date(),
      })
      .where(eq(schema.hubChannels.id, channel.id));
    return fresh.accessToken;
  } catch (err) {
    if (err instanceof RefreshRejected) await markHubExpired(channel.id, err.message);
    return null;
  }
}

async function markHubExpired(id: string, reason: string) {
  await getDb()
    .update(schema.hubChannels)
    .set({ estadoConexion: "expirada", error: reason, updatedAt: new Date() })
    .where(eq(schema.hubChannels.id, id));
}

/** Cuentas activas que aceptan el nicho: las etiquetadas con ese nicho primero, luego las generales (sin nichos). */
export function channelsForNicho(channels: DbHubChannel[], nicho: string): DbHubChannel[] {
  const target = normalizeNicho(nicho);
  const words = new Set(target.split(" ").filter((w) => w.length > 2));
  const active = channels.filter((c) => c.activo && c.estadoConexion === "conectada");
  const specific = active.filter((c) =>
    c.nichos.some((n) => n === target || n.split(" ").some((w) => words.has(w))),
  );
  const general = active.filter((c) => c.nichos.length === 0);
  return [...specific, ...general.filter((g) => !specific.includes(g))];
}
