import { and, eq, gte, inArray, isNull, lt, or } from "drizzle-orm";

import { getDb, schema } from "@/server/db";
import { getFreshOAuthAccount } from "@/server/auth/token-refresh";
import type { DbOAuthAccount } from "@/server/db/schema";
import type { MetricsSyncStatus, Red } from "@/lib/mock/types";
import {
  collectFacebookPage,
  collectFacebookPost,
  collectInstagramAccount,
  collectInstagramMedia,
  collectTikTokAccount,
  collectTikTokVideos,
  collectYouTubeChannel,
  collectYouTubeVideos,
  resolveTikTokVideoId,
  type AccountResult,
  type CollectResult,
  type MetricValues,
} from "./collectors";

const LOOKBACK_DAYS = 90;
const REDES: Red[] = ["facebook", "instagram", "youtube", "tiktok"];
const RECONNECT_PREFIX = "[reconectar] ";
/** Intervalo mínimo entre sincronizaciones automáticas de un mismo usuario. */
export const AUTO_SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000;

type Target = { postId: string; red: Red; surface: string; externalId: string };

type StoredItem = {
  surface: string;
  externalId: string;
  resolvedId?: string;
  error?: string;
  notes?: string[];
};

export interface NetworkSyncResult {
  red: Red;
  conectada: boolean;
  publicaciones: number;
  actualizadas: number;
  pendientes: number;
  seguidores?: number;
  error?: string;
  reconectar?: boolean;
}

export interface MetricsSyncSummary {
  syncedAt: string;
  redes: NetworkSyncResult[];
}

function isRed(v: string): v is Red {
  return (REDES as string[]).includes(v);
}

function defaultSurface(red: Red, tipo: string): string {
  if (red === "facebook") return tipo === "video" ? "feed_video" : "feed";
  if (red === "youtube") return "shorts";
  if (red === "tiktok") return "fyp";
  return tipo === "video" ? "reel" : "feed";
}

async function loadTargets(userId: string): Promise<Target[]> {
  const db = getDb();
  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  const dists = await db
    .select({
      postId: schema.postDistributions.postId,
      channelType: schema.postDistributions.channelType,
      externalId: schema.postDistributions.externalId,
    })
    .from(schema.postDistributions)
    .where(
      and(
        eq(schema.postDistributions.userId, userId),
        eq(schema.postDistributions.status, "published"),
        gte(schema.postDistributions.createdAt, since),
      ),
    );

  const targets: Target[] = [];
  const seen = new Set<string>();
  const covered = new Set<string>();
  for (const d of dists) {
    if (!d.externalId) continue;
    const [red, surface = "feed"] = d.channelType.split(":");
    if (!isRed(red) || surface === "group") continue;
    const key = `${d.postId}|${red}|${d.externalId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    covered.add(`${d.postId}|${red}`);
    targets.push({ postId: d.postId, red, surface, externalId: d.externalId });
  }

  // Publicaciones anteriores al registro de distribuciones solo guardan posts.external_ids.
  const posts = await db
    .select({ id: schema.posts.id, tipo: schema.posts.tipo, externalIds: schema.posts.externalIds })
    .from(schema.posts)
    .where(
      and(
        eq(schema.posts.userId, userId),
        eq(schema.posts.estado, "publicado"),
        gte(schema.posts.fechaPublicacion, since),
      ),
    );
  for (const p of posts) {
    for (const [red, externalId] of Object.entries(p.externalIds ?? {})) {
      if (!externalId || !isRed(red) || covered.has(`${p.id}|${red}`)) continue;
      targets.push({ postId: p.id, red, surface: defaultSurface(red, p.tipo), externalId });
    }
  }
  return targets;
}

function addValues(acc: MetricValues | null, v: MetricValues): MetricValues {
  if (!acc) return { ...v };
  const sumNullable = (a: number | null, b: number | null) =>
    a == null && b == null ? null : (a ?? 0) + (b ?? 0);
  return {
    vistas: acc.vistas + v.vistas,
    alcance: sumNullable(acc.alcance, v.alcance),
    likes: acc.likes + v.likes,
    comentarios: acc.comentarios + v.comentarios,
    compartidos: acc.compartidos + v.compartidos,
    guardados: sumNullable(acc.guardados, v.guardados),
    clics: sumNullable(acc.clics, v.clics),
  };
}

async function collectForTargets(
  red: Red,
  acc: DbOAuthAccount,
  targets: Target[],
  resolvedCache: Map<string, string>,
): Promise<Map<Target, CollectResult>> {
  const out = new Map<Target, CollectResult>();
  const token = acc.accessToken;

  if (red === "facebook" || red === "instagram") {
    for (const t of targets) {
      out.set(
        t,
        red === "facebook"
          ? await collectFacebookPost(t.externalId, t.surface, token)
          : await collectInstagramMedia(t.externalId, token),
      );
    }
    return out;
  }

  if (red === "youtube") {
    const results = await collectYouTubeVideos(
      targets.map((t) => t.externalId),
      token,
    );
    for (const t of targets)
      out.set(t, results.get(t.externalId) ?? { ok: false, error: "Sin respuesta" });
    return out;
  }

  const videoIdFor = new Map<Target, string>();
  for (const t of targets) {
    const cached = resolvedCache.get(t.externalId);
    if (cached) {
      videoIdFor.set(t, cached);
      continue;
    }
    const resolved = await resolveTikTokVideoId(t.externalId, token);
    if (resolved.ok) videoIdFor.set(t, resolved.videoId);
    else out.set(t, resolved);
  }
  const results = await collectTikTokVideos([...new Set(videoIdFor.values())], token);
  for (const [t, videoId] of videoIdFor) {
    out.set(t, results.get(videoId) ?? { ok: false, error: "Sin respuesta" });
  }
  return out;
}

async function collectAccount(red: Red, acc: DbOAuthAccount): Promise<AccountResult> {
  const token = acc.accessToken;
  if (red === "facebook") {
    return acc.externalAccountId
      ? collectFacebookPage(acc.externalAccountId, token)
      : { ok: false, error: "Falta el ID de la página" };
  }
  if (red === "instagram") {
    return acc.externalAccountId
      ? collectInstagramAccount(acc.externalAccountId, token)
      : { ok: false, error: "Falta el ID de la cuenta de Instagram" };
  }
  if (red === "youtube") return collectYouTubeChannel(token);
  return collectTikTokAccount(token);
}

async function syncNetwork(
  userId: string,
  red: Red,
  targets: Target[],
  existing: Map<string, StoredItem[]>,
): Promise<NetworkSyncResult> {
  const db = getDb();
  const acc = await getFreshOAuthAccount(userId, red);
  if (!acc) {
    const raw = await db
      .select({
        estado: schema.oauthAccounts.estadoConexion,
        error: schema.oauthAccounts.metricsError,
      })
      .from(schema.oauthAccounts)
      .where(and(eq(schema.oauthAccounts.userId, userId), eq(schema.oauthAccounts.red, red)))
      .limit(1);
    const row = raw[0];
    return {
      red,
      conectada: false,
      publicaciones: targets.length,
      actualizadas: 0,
      pendientes: 0,
      error: row ? (row.error ?? "Cuenta desconectada") : undefined,
      reconectar: !!row,
    };
  }

  const resolvedCache = new Map<string, string>();
  for (const items of existing.values()) {
    for (const it of items) if (it.resolvedId) resolvedCache.set(it.externalId, it.resolvedId);
  }

  const results = await collectForTargets(red, acc, targets, resolvedCache);

  let reconectar = false;
  let firstError: string | undefined;
  let pendientes = 0;
  const byPost = new Map<string, { values: MetricValues | null; items: StoredItem[] }>();

  for (const t of targets) {
    const r = results.get(t) ?? { ok: false as const, error: "Sin respuesta" };
    const entry = byPost.get(t.postId) ?? { values: null, items: [] };
    if (r.ok) {
      entry.values = addValues(entry.values, r.values);
      entry.items.push({
        surface: t.surface,
        externalId: t.externalId,
        resolvedId: r.resolvedId,
        notes: r.notes,
      });
      if (r.notes?.length && !firstError) firstError = r.notes[0];
    } else {
      if (r.pending) pendientes++;
      else firstError ??= r.error;
      if (r.reconnect) reconectar = true;
      const prev = existing.get(`${t.postId}|${red}`)?.find((i) => i.externalId === t.externalId);
      entry.items.push({
        surface: t.surface,
        externalId: t.externalId,
        resolvedId: prev?.resolvedId,
        error: r.error,
      });
    }
    byPost.set(t.postId, entry);
  }

  let actualizadas = 0;
  const now = new Date();
  for (const [postId, { values, items }] of byPost) {
    if (!values) continue;
    const set = {
      externalId: items.map((i) => i.resolvedId ?? i.externalId).join(","),
      vistas: values.vistas,
      alcance: values.alcance,
      likes: values.likes,
      comentarios: values.comentarios,
      compartidos: values.compartidos,
      guardados: values.guardados,
      clics: values.clics,
      raw: { items },
      fetchedAt: now,
    };
    await db
      .insert(schema.postMetrics)
      .values({ userId, postId, red, ...set })
      .onConflictDoUpdate({ target: [schema.postMetrics.postId, schema.postMetrics.red], set });
    actualizadas++;
  }

  const account = await collectAccount(red, acc);
  let seguidores: number | undefined;
  if (account.ok) {
    seguidores = account.stats.seguidores;
    const snap = {
      seguidores: account.stats.seguidores,
      publicaciones: account.stats.publicaciones,
      vistasTotales: account.stats.vistasTotales,
      raw: account.stats.raw,
    };
    await db
      .insert(schema.accountSnapshots)
      .values({ userId, red, fecha: now.toISOString().slice(0, 10), ...snap })
      .onConflictDoUpdate({
        target: [
          schema.accountSnapshots.userId,
          schema.accountSnapshots.red,
          schema.accountSnapshots.fecha,
        ],
        set: snap,
      });
  } else {
    firstError ??= account.error;
    if (account.reconnect) reconectar = true;
  }

  const error = firstError
    ? `${reconectar ? RECONNECT_PREFIX : ""}${firstError}`.slice(0, 500)
    : null;
  await db
    .update(schema.oauthAccounts)
    .set({ metricsSyncedAt: now, metricsError: error })
    .where(eq(schema.oauthAccounts.id, acc.id));

  return {
    red,
    conectada: true,
    publicaciones: byPost.size,
    actualizadas,
    pendientes,
    seguidores,
    error: firstError,
    reconectar,
  };
}

/** Lee métricas reales de todas las redes conectadas del usuario y las guarda en Postgres. */
export async function syncUserMetrics(userId: string): Promise<MetricsSyncSummary> {
  const db = getDb();
  const targets = await loadTargets(userId);

  const existingRows = await db
    .select({
      postId: schema.postMetrics.postId,
      red: schema.postMetrics.red,
      raw: schema.postMetrics.raw,
    })
    .from(schema.postMetrics)
    .where(eq(schema.postMetrics.userId, userId));
  const existing = new Map<string, StoredItem[]>();
  for (const r of existingRows) {
    const items = (r.raw as { items?: StoredItem[] } | null)?.items ?? [];
    existing.set(`${r.postId}|${r.red}`, items);
  }

  const connected = await db
    .select({ red: schema.oauthAccounts.red })
    .from(schema.oauthAccounts)
    .where(eq(schema.oauthAccounts.userId, userId));
  const redes = REDES.filter((red) => connected.some((c) => c.red === red));

  const results: NetworkSyncResult[] = [];
  for (const red of redes) {
    try {
      results.push(
        await syncNetwork(
          userId,
          red,
          targets.filter((t) => t.red === red),
          existing,
        ),
      );
    } catch (err) {
      console.error(`[metrics] ${red}`, err);
      results.push({
        red,
        conectada: true,
        publicaciones: 0,
        actualizadas: 0,
        pendientes: 0,
        error: err instanceof Error ? err.message : "Error inesperado",
      });
    }
  }
  return { syncedAt: new Date().toISOString(), redes: results };
}

/** Estado de sincronización por red, para mostrar en la app. */
export async function getMetricsSyncStatus(userId: string): Promise<MetricsSyncStatus[]> {
  const rows = await getDb()
    .select({
      red: schema.oauthAccounts.red,
      estado: schema.oauthAccounts.estadoConexion,
      syncedAt: schema.oauthAccounts.metricsSyncedAt,
      error: schema.oauthAccounts.metricsError,
    })
    .from(schema.oauthAccounts)
    .where(eq(schema.oauthAccounts.userId, userId));
  return rows.map((r) => {
    const reconectar = r.estado !== "conectada" || !!r.error?.startsWith(RECONNECT_PREFIX);
    return {
      red: r.red,
      conectada: r.estado === "conectada",
      synced_at: r.syncedAt?.toISOString() ?? null,
      error: r.error?.replace(RECONNECT_PREFIX, "") ?? null,
      reconectar,
    };
  });
}

/** Para el cron: usuarios con cuentas conectadas cuyas métricas tienen más de 6 h. */
export async function findUsersDueForMetrics(limit: number): Promise<string[]> {
  const cutoff = new Date(Date.now() - AUTO_SYNC_INTERVAL_MS);
  const rows = await getDb()
    .select({ userId: schema.oauthAccounts.userId })
    .from(schema.oauthAccounts)
    .where(
      and(
        eq(schema.oauthAccounts.estadoConexion, "conectada"),
        inArray(schema.oauthAccounts.red, REDES),
        or(
          isNull(schema.oauthAccounts.metricsSyncedAt),
          lt(schema.oauthAccounts.metricsSyncedAt, cutoff),
        ),
      ),
    )
    .orderBy(schema.oauthAccounts.metricsSyncedAt)
    .limit(limit * 4);
  return [...new Set(rows.map((r) => r.userId))].slice(0, limit);
}
