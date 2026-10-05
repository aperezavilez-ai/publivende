import { and, eq, gte, inArray, ne } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "@/server/db";
import type { DbPost, DbUser } from "@/server/db/schema";
import { findUserById, getOAuthAccount } from "@/server/auth/users";
import { isRealAIEnabled } from "@/server/config";
import { reviewBoostOpenAI } from "@/server/ai/openai";
import { publishToNetworkMulti } from "@/server/publish/networks";
import { resolveAppBaseUrl } from "@/lib/app-url";
import { inferNichoFromText } from "@/services/import/inferNiche";
import { BOOST_LIMITS, normalizeNicho, redAcceptsMedia } from "@/lib/red/limits";
import type { Plan, PublishSurfaceResult } from "@/lib/mock/types";
import { channelsForNicho, getFreshHubToken, listHubChannels, type DbHubChannel } from "./channels";

export type DbBoost = typeof schema.boostRequests.$inferSelect;

function startOfMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export async function boostQuota(user: DbUser): Promise<{ usados: number; limite: number | null }> {
  const rows = await getDb()
    .select({ id: schema.boostRequests.id })
    .from(schema.boostRequests)
    .where(
      and(
        eq(schema.boostRequests.userId, user.id),
        gte(schema.boostRequests.createdAt, startOfMonth()),
        ne(schema.boostRequests.estado, "rechazado"),
      ),
    );
  return { usados: rows.length, limite: user.isAdmin ? null : BOOST_LIMITS[(user.plan ?? "free") as Plan] };
}

export async function getBoostForPost(postId: string): Promise<DbBoost | null> {
  const rows = await getDb().select().from(schema.boostRequests).where(eq(schema.boostRequests.postId, postId)).limit(1);
  return rows[0] ?? null;
}

async function loadBoostContext(boostId: string) {
  const db = getDb();
  const boost = (await db.select().from(schema.boostRequests).where(eq(schema.boostRequests.id, boostId)).limit(1))[0];
  if (!boost) throw new Error("Solicitud no encontrada");
  const post = (await db.select().from(schema.posts).where(eq(schema.posts.id, boost.postId)).limit(1))[0];
  if (!post) throw new Error("La publicación ya no existe");
  const user = await findUserById(boost.userId);
  if (!user) throw new Error("El usuario ya no existe");
  return { boost, post, user };
}

function mediaTypeOf(post: DbPost): "imagen" | "video" | "texto" {
  if (!post.mediaUrl?.startsWith("http")) return "texto";
  return post.tipo === "video" ? "video" : "imagen";
}

function negocioContext(user: DbUser): string {
  return [
    `Nombre: ${user.nombreNegocio || user.nombre}`,
    user.industria ? `Giro: ${user.industria}` : "",
    user.ciudad ? `Ciudad: ${user.ciudad}` : "",
    user.descripcionNegocio ? `Descripción: ${user.descripcionNegocio}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

const reviewSchema = z.object({
  nicho: z.string().min(1).max(60),
  score: z.coerce.number().min(0).max(100),
  motivo: z.string().min(1).max(400),
  copy: z.string().max(1500).default(""),
  canales: z.array(z.string()).default([]),
});

function reviewByRules(post: DbPost, user: DbUser, candidates: DbHubChannel[]) {
  const inferred = inferNichoFromText(post.copy);
  const nicho = normalizeNicho(user.industria || (inferred === "default" ? "general" : inferred)) || "general";
  const media = mediaTypeOf(post);
  let score = 50;
  if (media !== "texto") score += 15;
  if (post.copy.length >= 80 && post.copy.length <= 1200) score += 10;
  if (post.copy.length < 30) score -= 30;
  score = Math.max(0, Math.min(100, score));
  const negocio = user.nombreNegocio || user.nombre;
  return {
    nicho,
    score,
    motivo: "Revisión básica sin IA (falta configurar MeAI): se evaluó si trae imagen o video y la longitud del texto.",
    copy: `${negocio}${user.ciudad ? ` (${user.ciudad})` : ""} 👇\n\n${post.copy}`.slice(0, 900),
    canales: channelsForNicho(candidates, nicho).map((c) => c.id),
  };
}

/** Clasifica nicho, califica y prepara el texto para las cuentas oficiales. */
export async function reviewBoost(boostId: string): Promise<DbBoost> {
  const { post, user } = await loadBoostContext(boostId);
  const media = mediaTypeOf(post);
  const candidates = (await listHubChannels()).filter(
    (c) => c.activo && c.estadoConexion === "conectada" && redAcceptsMedia(c.red, media),
  );

  let review = reviewByRules(post, user, candidates);
  let fuente: "ia" | "reglas" = "reglas";

  if (isRealAIEnabled()) {
    try {
      const raw = await reviewBoostOpenAI({
        negocio: negocioContext(user),
        postCopy: post.copy,
        mediaType: media,
        canales: candidates.map((c) => ({ id: c.id, red: c.red, nombre: c.nombre, nichos: c.nichos })),
      });
      const parsed = reviewSchema.parse(raw);
      const nicho = normalizeNicho(parsed.nicho) || review.nicho;
      const valid = parsed.canales.filter((id) => candidates.some((c) => c.id === id));
      review = {
        nicho,
        score: Math.round(parsed.score),
        motivo: parsed.motivo,
        copy: parsed.copy.trim() || review.copy,
        canales: valid.length ? valid : channelsForNicho(candidates, nicho).map((c) => c.id),
      };
      fuente = "ia";
    } catch (err) {
      console.error("[red] revisión IA falló, uso reglas:", err instanceof Error ? err.message : err);
    }
  }

  const rows = await getDb()
    .update(schema.boostRequests)
    .set({
      nicho: review.nicho,
      iaScore: review.score,
      iaMotivo: review.motivo,
      iaFuente: fuente,
      copyRed: review.copy,
      canales: review.canales,
      updatedAt: new Date(),
    })
    .where(eq(schema.boostRequests.id, boostId))
    .returning();
  return rows[0]!;
}

export async function createBoostRequest(userId: string, postId: string): Promise<DbBoost> {
  const rows = await getDb().insert(schema.boostRequests).values({ userId, postId }).returning();
  return reviewBoost(rows[0]!.id);
}

/** Publica la publicación del usuario en las cuentas oficiales elegidas, con su link rastreable. */
export async function publishBoost(
  boostId: string,
  override: { copy?: string; canales?: string[] } = {},
): Promise<DbBoost> {
  const { boost, post, user } = await loadBoostContext(boostId);
  const copy = (override.copy ?? boost.copyRed ?? post.copy).trim();
  const ids = override.canales ?? boost.canales;
  if (!ids.length) throw new Error("No hay cuentas oficiales activas para este nicho. Conecta o activa una en Red PubliVende.");

  const channels = await getDb().select().from(schema.hubChannels).where(inArray(schema.hubChannels.id, ids));
  const media = mediaTypeOf(post);
  const appUrl = resolveAppBaseUrl();
  const igAccount = await getOAuthAccount(user.id, "instagram");
  const igUsername = igAccount?.estadoConexion === "conectada" ? igAccount.nombreCuenta.replace(/^@/, "") : undefined;

  const resultados: Array<PublishSurfaceResult & { hub_channel_id: string }> = [];
  for (const channel of channels) {
    const base = { red: channel.red, surface: "red_publivende", channel_name: channel.nombre, hub_channel_id: channel.id };
    if (!redAcceptsMedia(channel.red, media)) {
      resultados.push({ ...base, ok: false, error: media === "texto" ? "Esta red necesita imagen o video" : "Esta red necesita video" });
      continue;
    }
    const token = await getFreshHubToken(channel);
    if (!token) {
      resultados.push({ ...base, ok: false, error: "La cuenta oficial perdió el acceso; reconéctala" });
      continue;
    }
    const surfaces = await publishToNetworkMulti({
      red: channel.red,
      accessToken: token,
      pageId: channel.externalAccountId,
      copy,
      mediaUrl: post.mediaUrl,
      mediaType: media === "video" ? "video" : "imagen",
      trackingSlug: post.trackingSlug,
      appUrl,
      collaborators: channel.red === "instagram" && igUsername ? [igUsername] : undefined,
    });
    for (const s of surfaces) {
      resultados.push({ ...s, channel_name: channel.nombre, hub_channel_id: channel.id });
      await getDb().insert(schema.postDistributions).values({
        userId: user.id,
        postId: post.id,
        channelType: `red_publivende:${channel.red}`,
        channelId: channel.id,
        channelName: `Red PubliVende · ${channel.nombre}`,
        externalId: s.external_id,
        status: s.ok ? "published" : "failed",
        error: s.error,
      });
    }
  }

  const anyOk = resultados.some((r) => r.ok);
  const rows = await getDb()
    .update(schema.boostRequests)
    .set({
      estado: anyOk ? "publicado" : "error",
      copyRed: copy,
      canales: ids,
      resultados,
      publicadoAt: anyOk ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(schema.boostRequests.id, boostId))
    .returning();
  return rows[0]!;
}

export async function rejectBoost(boostId: string, motivo: string) {
  await getDb()
    .update(schema.boostRequests)
    .set({ estado: "rechazado", motivoRechazo: motivo, updatedAt: new Date() })
    .where(eq(schema.boostRequests.id, boostId));
}
