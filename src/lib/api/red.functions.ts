import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { desc, eq, inArray } from "drizzle-orm";

import { isProductionMode, isRealAIEnabled } from "@/server/config";
import { verifySessionToken } from "@/server/auth/crypto";
import { findUserById } from "@/server/auth/users";
import { getDb, schema } from "@/server/db";
import { resolveAppBaseUrl } from "@/lib/app-url";
import { generateHubPostOpenAI } from "@/server/ai/openai";
import { publishToNetworkMulti } from "@/server/publish/networks";
import {
  deleteHubChannel,
  getFreshHubToken,
  listHubChannels,
  updateHubChannel,
  type DbHubChannel,
} from "@/server/red/channels";
import {
  boostQuota,
  createBoostRequest,
  getBoostForPost,
  publishBoost,
  rejectBoost,
  reviewBoost,
  type DbBoost,
} from "@/server/red/boost";
import { BOOST_MIN_SCORE, redAcceptsMedia } from "@/lib/red/limits";

async function requireUser(token: string) {
  const session = await verifySessionToken(token);
  if (!session) throw new Error("Sesión inválida");
  const user = await findUserById(session.userId);
  if (!user) throw new Error("Sesión inválida");
  return user;
}

async function requireAdmin(token: string) {
  const user = await requireUser(token);
  if (!user.isAdmin) throw new Error("Solo administradores");
  return user;
}

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Error inesperado";
}

function boostToClient(b: DbBoost) {
  return {
    id: b.id,
    post_id: b.postId,
    estado: b.estado,
    nicho: b.nicho,
    ia_score: b.iaScore,
    ia_motivo: b.iaMotivo,
    ia_fuente: b.iaFuente,
    copy_red: b.copyRed,
    canales: b.canales,
    resultados: (b.resultados ?? []).map((r) => ({
      red: r.red,
      channel_name: r.channel_name ?? "",
      ok: r.ok,
      error: r.error ?? null,
      external_id: r.external_id ?? null,
    })),
    motivo_rechazo: b.motivoRechazo,
    created_at: b.createdAt.toISOString(),
    publicado_at: b.publicadoAt?.toISOString() ?? null,
  };
}

function channelToClient(c: DbHubChannel) {
  return {
    id: c.id,
    red: c.red,
    nombre: c.nombre,
    avatar: c.avatar,
    nichos: c.nichos,
    activo: c.activo,
    estado_conexion: c.estadoConexion,
    error: c.error,
  };
}

/* ---------- Usuario ---------- */

export const getBoostStatus = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string(), postId: z.string().uuid() }))
  .handler(async ({ data }) => {
    if (!isProductionMode()) return { ok: false as const, error: "Requiere producción" };
    try {
      const user = await requireUser(data.token);
      const boost = await getBoostForPost(data.postId);
      if (boost && boost.userId !== user.id) return { ok: false as const, error: "Publicación no encontrada" };
      const quota = await boostQuota(user);
      return { ok: true as const, boost: boost ? boostToClient(boost) : null, quota };
    } catch (err) {
      return { ok: false as const, error: errorMessage(err) };
    }
  });

export const requestBoost = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string(), postId: z.string().uuid(), acepto: z.literal(true) }))
  .handler(async ({ data }) => {
    if (!isProductionMode()) return { ok: false as const, error: "Requiere producción" };
    try {
      const user = await requireUser(data.token);
      const post = (await getDb().select().from(schema.posts).where(eq(schema.posts.id, data.postId)).limit(1))[0];
      if (!post || post.userId !== user.id) return { ok: false as const, error: "Publicación no encontrada" };
      if (post.estado !== "publicado") {
        return { ok: false as const, error: "Primero publica el contenido en tus redes; después puedes impulsarlo." };
      }
      if (await getBoostForPost(post.id)) {
        return { ok: false as const, error: "Esta publicación ya tiene una solicitud de impulso." };
      }
      const quota = await boostQuota(user);
      if (quota.limite !== null && quota.usados >= quota.limite) {
        return {
          ok: false as const,
          error: `Usaste tus ${quota.limite} impulso(s) de este mes. Sube de plan para tener más.`,
        };
      }
      const boost = await createBoostRequest(user.id, post.id);
      return { ok: true as const, boost: boostToClient(boost) };
    } catch (err) {
      return { ok: false as const, error: errorMessage(err) };
    }
  });

/* ---------- Administrador ---------- */

export const redAdminOverview = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    if (!isProductionMode()) return { ok: false as const, error: "Requiere producción" };
    try {
      await requireAdmin(data.token);
      const db = getDb();
      const channels = await listHubChannels();
      const boosts = await db
        .select()
        .from(schema.boostRequests)
        .orderBy(desc(schema.boostRequests.createdAt))
        .limit(150);

      const postIds = [...new Set(boosts.map((b) => b.postId))];
      const userIds = [...new Set(boosts.map((b) => b.userId))];
      const posts = postIds.length
        ? await db.select().from(schema.posts).where(inArray(schema.posts.id, postIds))
        : [];
      const users = userIds.length
        ? await db
            .select({
              id: schema.users.id,
              nombre: schema.users.nombre,
              nombreNegocio: schema.users.nombreNegocio,
              email: schema.users.email,
              plan: schema.users.plan,
            })
            .from(schema.users)
            .where(inArray(schema.users.id, userIds))
        : [];

      const queue = boosts.map((b) => {
        const post = posts.find((p) => p.id === b.postId);
        const user = users.find((u) => u.id === b.userId);
        return {
          ...boostToClient(b),
          post: post
            ? { copy: post.copy, media_url: post.mediaUrl, tipo: post.tipo, tracking_slug: post.trackingSlug }
            : null,
          usuario: user
            ? { negocio: user.nombreNegocio || user.nombre, email: user.email, plan: user.plan }
            : null,
        };
      });

      const demanda = new Map<string, { nicho: string; solicitudes: number; publicadas: number }>();
      for (const b of boosts) {
        const key = b.nicho || "sin clasificar";
        const row = demanda.get(key) ?? { nicho: key, solicitudes: 0, publicadas: 0 };
        row.solicitudes += 1;
        if (b.estado === "publicado") row.publicadas += 1;
        demanda.set(key, row);
      }

      return {
        ok: true as const,
        ia_activa: isRealAIEnabled(),
        min_score: BOOST_MIN_SCORE,
        channels: channels.map(channelToClient),
        queue,
        demanda: [...demanda.values()].sort((a, b) => b.solicitudes - a.solicitudes),
      };
    } catch (err) {
      return { ok: false as const, error: errorMessage(err) };
    }
  });

export const redUpdateChannel = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string(),
      id: z.string().uuid(),
      nichos: z.array(z.string().max(60)).max(20).optional(),
      activo: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    if (!isProductionMode()) return { ok: false as const, error: "Requiere producción" };
    try {
      await requireAdmin(data.token);
      await updateHubChannel(data.id, { nichos: data.nichos, activo: data.activo });
      return { ok: true as const };
    } catch (err) {
      return { ok: false as const, error: errorMessage(err) };
    }
  });

export const redDeleteChannel = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string(), id: z.string().uuid() }))
  .handler(async ({ data }) => {
    if (!isProductionMode()) return { ok: false as const, error: "Requiere producción" };
    try {
      await requireAdmin(data.token);
      await deleteHubChannel(data.id);
      return { ok: true as const };
    } catch (err) {
      return { ok: false as const, error: errorMessage(err) };
    }
  });

export const redReviewBoost = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string(), id: z.string().uuid() }))
  .handler(async ({ data }) => {
    if (!isProductionMode()) return { ok: false as const, error: "Requiere producción" };
    try {
      await requireAdmin(data.token);
      return { ok: true as const, boost: boostToClient(await reviewBoost(data.id)) };
    } catch (err) {
      return { ok: false as const, error: errorMessage(err) };
    }
  });

export const redApproveBoost = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string(),
      id: z.string().uuid(),
      copy: z.string().min(1).max(2200).optional(),
      canales: z.array(z.string().uuid()).optional(),
    }),
  )
  .handler(async ({ data }) => {
    if (!isProductionMode()) return { ok: false as const, error: "Requiere producción" };
    try {
      await requireAdmin(data.token);
      const boost = await publishBoost(data.id, { copy: data.copy, canales: data.canales });
      return { ok: true as const, boost: boostToClient(boost) };
    } catch (err) {
      return { ok: false as const, error: errorMessage(err) };
    }
  });

export const redRejectBoost = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string(), id: z.string().uuid(), motivo: z.string().min(3).max(400) }))
  .handler(async ({ data }) => {
    if (!isProductionMode()) return { ok: false as const, error: "Requiere producción" };
    try {
      await requireAdmin(data.token);
      await rejectBoost(data.id, data.motivo);
      return { ok: true as const };
    } catch (err) {
      return { ok: false as const, error: errorMessage(err) };
    }
  });

export const redGenerateHubPost = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string(), channelId: z.string().uuid(), tema: z.string().max(300).optional() }))
  .handler(async ({ data }) => {
    if (!isProductionMode()) return { ok: false as const, error: "Requiere producción" };
    try {
      await requireAdmin(data.token);
      if (!isRealAIEnabled()) return { ok: false as const, error: "Configura MEAI_API_KEY para generar contenido con IA." };
      const channel = (await listHubChannels()).find((c) => c.id === data.channelId);
      if (!channel) return { ok: false as const, error: "Cuenta no encontrada" };
      const copy = await generateHubPostOpenAI({
        cuenta: channel.nombre,
        red: channel.red,
        nichos: channel.nichos,
        tema: data.tema,
      });
      return { ok: true as const, copy };
    } catch (err) {
      return { ok: false as const, error: errorMessage(err) };
    }
  });

export const redPublishHubPost = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string(),
      channelId: z.string().uuid(),
      copy: z.string().min(1).max(2200),
      mediaUrl: z.string().url().optional(),
      mediaType: z.enum(["imagen", "video"]).default("imagen"),
    }),
  )
  .handler(async ({ data }) => {
    if (!isProductionMode()) return { ok: false as const, error: "Requiere producción" };
    try {
      await requireAdmin(data.token);
      const channel = (await listHubChannels()).find((c) => c.id === data.channelId);
      if (!channel) return { ok: false as const, error: "Cuenta no encontrada" };
      const media = data.mediaUrl ? data.mediaType : "texto";
      if (!redAcceptsMedia(channel.red, media)) {
        return { ok: false as const, error: channel.red === "instagram" ? "Instagram necesita imagen o video" : "Esta red necesita video" };
      }
      const token = await getFreshHubToken(channel);
      if (!token) return { ok: false as const, error: "La cuenta perdió el acceso; reconéctala" };
      const appUrl = resolveAppBaseUrl();
      const surfaces = await publishToNetworkMulti({
        red: channel.red,
        accessToken: token,
        pageId: channel.externalAccountId,
        copy: data.copy,
        mediaUrl: data.mediaUrl,
        mediaType: data.mediaType,
        trackingSlug: "",
        appUrl,
        linkUrl: appUrl,
      });
      const ok = surfaces.find((s) => s.ok);
      return ok
        ? { ok: true as const, external_id: ok.external_id ?? null }
        : { ok: false as const, error: surfaces[0]?.error ?? "No se pudo publicar" };
    } catch (err) {
      return { ok: false as const, error: errorMessage(err) };
    }
  });
