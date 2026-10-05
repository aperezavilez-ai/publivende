import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { and, eq, inArray, sql } from "drizzle-orm";

import { isProductionMode } from "@/server/config";
import { verifySessionToken } from "@/server/auth/crypto";
import { findUserById } from "@/server/auth/users";
import { getDb, schema } from "@/server/db";
import type { DbPost } from "@/server/db/schema";
import { dbPostToClient } from "@/server/publish/service";
import { stageDataUrlMedia } from "@/server/publish/host-media";
import {
  generateAutopilotWeek,
  getAutopilotSettings,
  listAutopilotPosts,
  REGEN_COOLDOWN_MS,
  saveAutopilotSettings,
} from "@/server/autopilot/generate";
import { AUTOPILOT_LIMITS } from "@/lib/autopilot/planner";
import type { Red, ScheduleMeta } from "@/lib/mock/types";

const redSchema = z.enum(["facebook", "instagram", "tiktok", "youtube"]);
const MAX_MEDIA_DATA_URL = 40 * 1024 * 1024;
/** Margen para que el cron alcance a publicar lo que se aprueba. */
const MIN_LEAD_MS = 2 * 60000;

const demo = { ok: false as const, error: "Modo demo", useLocal: true as const };

async function sessionUser(token: string) {
  const session = await verifySessionToken(token);
  if (!session) return null;
  return findUserById(session.userId);
}

async function ownAutopilotPost(userId: string, postId: string): Promise<DbPost | null> {
  const [row] = await getDb()
    .select()
    .from(schema.posts)
    .where(
      and(
        eq(schema.posts.id, postId),
        eq(schema.posts.userId, userId),
        sql`(${schema.posts.scheduleMeta} -> 'autopilot') IS NOT NULL`,
      ),
    )
    .limit(1);
  return row ?? null;
}

async function connectedSet(userId: string): Promise<Set<Red>> {
  const rows = await getDb()
    .select({ red: schema.oauthAccounts.red })
    .from(schema.oauthAccounts)
    .where(
      and(
        eq(schema.oauthAccounts.userId, userId),
        eq(schema.oauthAccounts.estadoConexion, "conectada"),
      ),
    );
  return new Set(rows.map((r) => r.red));
}

export const getAutopilotServer = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    if (!isProductionMode()) return demo;
    const user = await sessionUser(data.token);
    if (!user) return { ok: false as const, error: "Sesión inválida" };
    const [settings, posts, connected] = await Promise.all([
      getAutopilotSettings(user.id),
      listAutopilotPosts(user.id),
      connectedSet(user.id),
    ]);
    return {
      ok: true as const,
      settings,
      posts,
      plan: user.plan,
      limits: AUTOPILOT_LIMITS[user.plan] ?? AUTOPILOT_LIMITS.free,
      cooldown_ms: REGEN_COOLDOWN_MS[user.plan] ?? REGEN_COOLDOWN_MS.free,
      connected: [...connected],
    };
  });

export const saveAutopilotSettingsServer = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string(),
      activo: z.boolean(),
      modo: z.enum(["aprobar", "automatico"]),
      posts_semana: z.number().int().min(1).max(14),
      redes: z.array(redSchema).max(4),
    }),
  )
  .handler(async ({ data }) => {
    if (!isProductionMode()) return demo;
    const user = await sessionUser(data.token);
    if (!user) return { ok: false as const, error: "Sesión inválida" };
    const { token: _token, ...input } = data;
    const settings = await saveAutopilotSettings(user, input);
    return { ok: true as const, settings };
  });

export const generateAutopilotServer = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    if (!isProductionMode()) return demo;
    const user = await sessionUser(data.token);
    if (!user) return { ok: false as const, error: "Sesión inválida" };
    return generateAutopilotWeek(user, { manual: true });
  });

export const updateAutopilotPostServer = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string(),
      post_id: z.string().uuid(),
      copy: z.string().trim().min(10).max(2200),
    }),
  )
  .handler(async ({ data }) => {
    if (!isProductionMode()) return demo;
    const user = await sessionUser(data.token);
    if (!user) return { ok: false as const, error: "Sesión inválida" };
    const post = await ownAutopilotPost(user.id, data.post_id);
    if (!post || !["borrador", "programado"].includes(post.estado)) {
      return { ok: false as const, error: "Esta publicación ya no se puede editar" };
    }
    const [row] = await getDb()
      .update(schema.posts)
      .set({ copy: data.copy, copyPorRed: null })
      .where(eq(schema.posts.id, post.id))
      .returning();
    return { ok: true as const, post: dbPostToClient(row) };
  });

async function approve(userId: string, post: DbPost, mediaUrl?: string, tipo?: DbPost["tipo"]) {
  const meta = (post.scheduleMeta ?? {}) as ScheduleMeta;
  if (post.estado !== "borrador" || meta.autopilot?.estado !== "pendiente") {
    return { ok: false as const, error: "Esta publicación ya fue aprobada o publicada" };
  }
  if (!post.fechaProgramada || post.fechaProgramada.getTime() < Date.now() + MIN_LEAD_MS) {
    return { ok: false as const, error: "La fecha ya pasó; descártala o regenera la semana" };
  }
  const finalMedia = mediaUrl ?? post.mediaUrl;
  if (meta.autopilot.requiere_media && !finalMedia) {
    return {
      ok: false as const,
      error:
        meta.autopilot.requiere_media === "video"
          ? "Sube el video antes de aprobar"
          : "Sube una foto antes de aprobar",
    };
  }
  const connected = await connectedSet(userId);
  const missing = (post.redesDestino ?? []).filter((r) => !connected.has(r));
  if (missing.length) {
    return {
      ok: false as const,
      error: `Reconecta estas redes antes de aprobar: ${missing.join(", ")}`,
    };
  }
  const nextMeta: ScheduleMeta = {
    ...meta,
    autopilot: {
      ...meta.autopilot,
      estado: "aprobado",
      aprobado_por: "cliente",
      requiere_media: undefined,
    },
  };
  const [row] = await getDb()
    .update(schema.posts)
    .set({
      estado: "programado",
      scheduleMeta: nextMeta,
      mediaUrl: finalMedia,
      tipo: tipo ?? post.tipo,
    })
    .where(eq(schema.posts.id, post.id))
    .returning();
  return { ok: true as const, post: dbPostToClient(row) };
}

export const approveAutopilotPostServer = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string(),
      post_id: z.string().uuid(),
      media_data_url: z.string().max(MAX_MEDIA_DATA_URL).optional(),
    }),
  )
  .handler(async ({ data }) => {
    if (!isProductionMode()) return demo;
    const user = await sessionUser(data.token);
    if (!user) return { ok: false as const, error: "Sesión inválida" };
    const post = await ownAutopilotPost(user.id, data.post_id);
    if (!post) return { ok: false as const, error: "Publicación no encontrada" };

    let mediaUrl: string | undefined;
    let tipo: DbPost["tipo"] | undefined;
    if (data.media_data_url) {
      const mime = data.media_data_url.match(/^data:([^;]+);base64,/)?.[1] ?? "";
      if (!mime.startsWith("video/") && !mime.startsWith("image/")) {
        return { ok: false as const, error: "Sube una imagen o un video" };
      }
      const needsVideo = post.redesDestino.some((r) => r === "tiktok" || r === "youtube");
      if (needsVideo && !mime.startsWith("video/")) {
        return { ok: false as const, error: "TikTok y YouTube solo aceptan video" };
      }
      mediaUrl = (await stageDataUrlMedia(user.id, data.media_data_url)) ?? undefined;
      if (!mediaUrl) return { ok: false as const, error: "No se pudo guardar el archivo" };
      tipo = mime.startsWith("video/") ? "video" : "imagen";
    }
    return approve(user.id, post, mediaUrl, tipo);
  });

export const approveAllAutopilotServer = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    if (!isProductionMode()) return demo;
    const user = await sessionUser(data.token);
    if (!user) return { ok: false as const, error: "Sesión inválida" };
    const pending = await getDb()
      .select()
      .from(schema.posts)
      .where(
        and(
          eq(schema.posts.userId, user.id),
          eq(schema.posts.estado, "borrador"),
          sql`${schema.posts.scheduleMeta}->'autopilot'->>'estado' = 'pendiente'`,
        ),
      );
    let aprobados = 0;
    const omitidos: string[] = [];
    for (const post of pending) {
      const res = await approve(user.id, post);
      if (res.ok) aprobados++;
      else omitidos.push(res.error);
    }
    return {
      ok: true as const,
      aprobados,
      omitidos: omitidos.length,
      posts: await listAutopilotPosts(user.id),
    };
  });

export const discardAutopilotPostServer = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string(), post_id: z.string().uuid() }))
  .handler(async ({ data }) => {
    if (!isProductionMode()) return demo;
    const user = await sessionUser(data.token);
    if (!user) return { ok: false as const, error: "Sesión inválida" };
    const deleted = await getDb()
      .delete(schema.posts)
      .where(
        and(
          eq(schema.posts.id, data.post_id),
          eq(schema.posts.userId, user.id),
          inArray(schema.posts.estado, ["borrador", "programado"]),
          sql`(${schema.posts.scheduleMeta} -> 'autopilot') IS NOT NULL`,
        ),
      )
      .returning({ id: schema.posts.id });
    if (!deleted.length) return { ok: false as const, error: "No encontrada o ya publicada" };
    return { ok: true as const };
  });
